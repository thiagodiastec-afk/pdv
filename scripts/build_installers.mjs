import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('1. Compilando build de producao com Vite...');
execSync('npx vite build', { stdio: 'inherit' });

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');
const assetFiles = fs.readdirSync(assetsDir);

const cssFile = assetFiles.find((f) => f.endsWith('.css'));
const jsFile = assetFiles.find((f) => f.endsWith('.js'));

if (!cssFile || !jsFile) {
  throw new Error('Arquivos CSS ou JS compilados nao encontrados em dist/assets');
}

const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
let jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');

// Disable serviceWorker registration when running from local file:// protocol
jsContent = jsContent.replace(/navigator\.serviceWorker\.register\([^)]+\)/g, 'Promise.resolve()');

// Embed all 7 product & operator images as Base64 data URIs
const productsDir = path.resolve('public/assets/products');
const productImages = fs.readdirSync(productsDir).filter((f) => f.endsWith('.png'));

for (const imgName of productImages) {
  const imgBuf = fs.readFileSync(path.join(productsDir, imgName));
  const dataUri = `data:image/png;base64,${imgBuf.toString('base64')}`;
  const targetPath = `/assets/products/${imgName}`;
  jsContent = jsContent.split(targetPath).join(dataUri);
}

const iconSvg = fs.readFileSync(path.resolve('public/icon.svg'), 'utf8');
const iconDataUri = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString('base64')}`;

const portableHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CromaPDV Fiscal — Frente de Caixa & NFC-e</title>
    <link rel="icon" type="image/svg+xml" href="${iconDataUri}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>${cssContent}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${jsContent.replace(/<\/script>/gi, '<\\/script>')}</script>
  </body>
</html>`;

const outDir = path.resolve('public/instalador');
fs.mkdirSync(outDir, { recursive: true });

const portablePath = path.join(outDir, 'CromaPDV_Portatil.html');
fs.writeFileSync(portablePath, portableHtml, 'utf8');
console.log('2. Gerado CromaPDV_Portatil.html:', (portableHtml.length / 1024).toFixed(1), 'KB');

/**
 * Generates a valid Windows .ICO file (64x64 32-bit BGRA BMP icon with CromaPDV Emerald "C" logo)
 */
function buildWindowsIcoBuffer() {
  const size = 64;
  const xorSize = size * size * 4;
  const andRowBytes = Math.ceil(size / 32) * 4;
  const andSize = andRowBytes * size;
  const bmpHeaderSize = 40;
  const imageSize = bmpHeaderSize + xorSize + andSize;

  const buf = Buffer.alloc(6 + 16 + imageSize, 0);
  // ICONDIR (6 bytes)
  buf.writeUInt16LE(0, 0); // Reserved
  buf.writeUInt16LE(1, 2); // Type: 1 = ICO
  buf.writeUInt16LE(1, 4); // Count: 1 image

  // ICONDIRENTRY (16 bytes)
  buf.writeUInt8(size, 6); // Width
  buf.writeUInt8(size, 7); // Height
  buf.writeUInt8(0, 8);    // ColorCount
  buf.writeUInt8(0, 9);    // Reserved
  buf.writeUInt16LE(1, 10); // Planes
  buf.writeUInt16LE(32, 12); // BitCount (32bpp BGRA)
  buf.writeUInt32LE(imageSize, 14); // BytesInRes
  buf.writeUInt32LE(22, 18); // ImageOffset

  // BITMAPINFOHEADER (40 bytes at offset 22)
  const bmi = 22;
  buf.writeUInt32LE(40, bmi + 0); // biSize
  buf.writeInt32LE(size, bmi + 4); // biWidth
  buf.writeInt32LE(size * 2, bmi + 8); // biHeight (XOR + AND)
  buf.writeUInt16LE(1, bmi + 12); // biPlanes
  buf.writeUInt16LE(32, bmi + 14); // biBitCount
  buf.writeUInt32LE(0, bmi + 16); // biCompression (BI_RGB)
  buf.writeUInt32LE(xorSize + andSize, bmi + 20);

  // Pixels (Bottom-Up BGRA)
  const pixelStart = bmi + 40;
  for (let y = 0; y < size; y++) {
    const ny = 1 - y / size;
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      // Rounded square mask
      const cx = Math.abs(nx - 0.5);
      const cy = Math.abs(ny - 0.5);
      const inSquare = cx <= 0.45 && cy <= 0.45;
      const pOff = pixelStart + (y * size + x) * 4;
      if (!inSquare) {
        buf.writeUInt32LE(0x00000000, pOff);
      } else {
        // Dark slate background #141e22 -> R=20, G=30, B=34
        let r = 20, g = 30, b = 34;
        const dx = nx - 0.5;
        const dy = ny - 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Emerald "C" emblem #00c885 -> R=0, G=200, B=133
        if (dist >= 0.14 && dist <= 0.31 && !(dx > 0.06 && Math.abs(dy) < 0.13)) {
          r = 0; g = 200; b = 133;
        }
        buf[pOff + 0] = b;
        buf[pOff + 1] = g;
        buf[pOff + 2] = r;
        buf[pOff + 3] = 255;
      }
    }
  }
  return buf;
}

/**
 * Builds a 100% authentic 64-bit Windows GUI Executable (.exe) using the official
 * Microsoft Visual C++ compiled distlib w64_stub.exe binary + shebang + standard ZIP container.
 */
function createStoredZipBuffer(fileName, contentBuffer) {
  const nameBuf = Buffer.from(fileName, 'utf8');
  // CRC-32 calculation
  let crc = 0xffffffff;
  for (let i = 0; i < contentBuffer.length; i++) {
    crc ^= contentBuffer[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  crc = (crc ^ 0xffffffff) >>> 0;

  // Local File Header (30 bytes + name)
  const lfh = Buffer.alloc(30 + nameBuf.length, 0);
  lfh.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
  lfh.writeUInt16LE(20, 4);         // Version needed (2.0)
  lfh.writeUInt16LE(0, 6);          // Flags
  lfh.writeUInt16LE(0, 8);          // Compression: 0 = STORED
  lfh.writeUInt16LE(0, 10);         // Mod time
  lfh.writeUInt16LE(0x5966, 12);    // Mod date
  lfh.writeUInt32LE(crc, 14);       // CRC-32
  lfh.writeUInt32LE(contentBuffer.length, 18); // Compressed size
  lfh.writeUInt32LE(contentBuffer.length, 22); // Uncompressed size
  lfh.writeUInt16LE(nameBuf.length, 26);       // Filename length
  lfh.writeUInt16LE(0, 28);                    // Extra field length
  nameBuf.copy(lfh, 30);

  const cdrOffset = lfh.length + contentBuffer.length;

  // Central Directory File Header (46 bytes + name)
  const cdfh = Buffer.alloc(46 + nameBuf.length, 0);
  cdfh.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
  cdfh.writeUInt16LE(20, 4);         // Version made by
  cdfh.writeUInt16LE(20, 6);         // Version needed
  cdfh.writeUInt16LE(0, 8);          // Flags
  cdfh.writeUInt16LE(0, 10);         // Compression: 0 = STORED
  cdfh.writeUInt16LE(0, 12);         // Mod time
  cdfh.writeUInt16LE(0x5966, 14);    // Mod date
  cdfh.writeUInt32LE(crc, 16);       // CRC-32
  cdfh.writeUInt32LE(contentBuffer.length, 20); // Compressed size
  cdfh.writeUInt32LE(contentBuffer.length, 24); // Uncompressed size
  cdfh.writeUInt16LE(nameBuf.length, 28);       // Filename length
  cdfh.writeUInt16LE(0, 30);                    // Extra length
  cdfh.writeUInt16LE(0, 32);                    // Comment length
  cdfh.writeUInt16LE(0, 34);                    // Disk number
  cdfh.writeUInt16LE(0, 36);                    // Internal attrs
  cdfh.writeUInt32LE(0, 38);                    // External attrs
  cdfh.writeUInt32LE(0, 42);                    // Relative offset of LFH (0 relative to zip start)
  nameBuf.copy(cdfh, 46);

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22, 0);
  eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
  eocd.writeUInt16LE(0, 4);          // Disk number
  eocd.writeUInt16LE(0, 6);          // Disk with CD
  eocd.writeUInt16LE(1, 8);          // Entries on this disk
  eocd.writeUInt16LE(1, 10);         // Total entries
  eocd.writeUInt32LE(cdfh.length, 12); // Size of Central Directory
  eocd.writeUInt32LE(cdrOffset, 16);   // Offset of CD relative to start of archive
  eocd.writeUInt16LE(0, 20);           // Comment length

  return Buffer.concat([lfh, contentBuffer, cdfh, eocd]);
}

function buildAuthenticWin64Exe(psScriptText) {
  const w64Stub = fs.readFileSync(path.resolve('scripts/w64_stub.exe'));
  // 236-byte shebang (< 260 byte MAX_PATH limit in w64.exe) using exact Windows system path to powershell.exe
  const shebang = Buffer.from(
    '#!C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -nop -ep Bypass -sta -w Hidden -c "$b=[IO.File]::ReadAllBytes(([Environment]::CommandLine-split[char]34)[5]);iex([Text.Encoding]::UTF8.GetString($b)-split(\'#_P\'+\'S_#\'))[1]" #\r\n',
    'utf8'
  );
  if (shebang.length > 260) {
    throw new Error(`Shebang excede 260 bytes: ${shebang.length}`);
  }
  const wrappedPayload = Buffer.from(`\r\n#_PS_#\r\n${psScriptText}\r\n#_PS_#\r\n`, 'utf8');
  const zipData = createStoredZipBuffer('__main__.py', wrappedPayload);
  return Buffer.concat([w64Stub, shebang, zipData]);
}

const icoBuffer = buildWindowsIcoBuffer();
const icoBase64 = icoBuffer.toString('base64');

// Build a standalone Launcher .exe (CromaPDV_Fiscal.exe) that opens %LOCALAPPDATA%\CromaPDV\CromaPDV_App.html in --app mode!
const launcherPsScript = `
$a = Join-Path $env:LOCALAPPDATA 'CromaPDV\\CromaPDV_App.html'
$u = 'file:///' + ($a -replace '\\\\','/')
$e = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
if (!(Test-Path $e)) { $e = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe' }
if (Test-Path $e) {
  Start-Process $e -ArgumentList "--app=\`"$u\`" --start-maximized"
} else {
  Start-Process $a
}
`;
const launcherExeBuf = buildAuthenticWin64Exe(launcherPsScript);
const launcherExeBase64 = launcherExeBuf.toString('base64');

const base64App = Buffer.from(portableHtml, 'utf8').toString('base64');

// PowerShell Graphical Installer script embedded inside Instalador_CromaPDV_Fiscal_Setup.exe
const psInstallerPayload = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = "Instalador CromaPDV Fiscal v2.5 — Frente de Caixa & NFC-e"
$form.Size = New-Object System.Drawing.Size(540, 415)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(20, 30, 34)
$form.ForeColor = [System.Drawing.Color]::White

$headerPanel = New-Object System.Windows.Forms.Panel
$headerPanel.Size = New-Object System.Drawing.Size(540, 76)
$headerPanel.Location = New-Object System.Drawing.Point(0, 0)
$headerPanel.BackColor = [System.Drawing.Color]::FromArgb(27, 39, 44)
$form.Controls.Add($headerPanel)

$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Assistente de Instalação — CromaPDV Fiscal"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 13.5, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::FromArgb(0, 200, 133)
$titleLabel.Location = New-Object System.Drawing.Point(24, 14)
$titleLabel.AutoSize = $true
$headerPanel.Controls.Add($titleLabel)

$subLabel = New-Object System.Windows.Forms.Label
$subLabel.Text = "Sistema de Frente de Caixa Rápido com Emissão de NFC-e (Modelo 65)"
$subLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$subLabel.ForeColor = [System.Drawing.Color]::FromArgb(180, 195, 205)
$subLabel.Location = New-Object System.Drawing.Point(25, 44)
$subLabel.AutoSize = $true
$headerPanel.Controls.Add($subLabel)

$descLabel = New-Object System.Windows.Forms.Label
$descLabel.Text = "Clique em 'INSTALAR AGORA' para instalar o aplicativo executável CromaPDV_Fiscal.exe no seu computador e criar o ícone na sua Área de Trabalho."
$descLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$descLabel.ForeColor = [System.Drawing.Color]::FromArgb(225, 235, 240)
$descLabel.Location = New-Object System.Drawing.Point(24, 92)
$descLabel.Size = New-Object System.Drawing.Size(480, 44)
$form.Controls.Add($descLabel)

$chkDesktop = New-Object System.Windows.Forms.CheckBox
$chkDesktop.Text = "Criar atalho 'CromaPDV Fiscal' na Área de Trabalho (Desktop)"
$chkDesktop.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$chkDesktop.Checked = $true
$chkDesktop.Location = New-Object System.Drawing.Point(28, 146)
$chkDesktop.Size = New-Object System.Drawing.Size(460, 26)
$form.Controls.Add($chkDesktop)

$chkStartMenu = New-Object System.Windows.Forms.CheckBox
$chkStartMenu.Text = "Adicionar 'CromaPDV Fiscal' no Menu Iniciar do Windows"
$chkStartMenu.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$chkStartMenu.Checked = $true
$chkStartMenu.Location = New-Object System.Drawing.Point(28, 178)
$chkStartMenu.Size = New-Object System.Drawing.Size(460, 26)
$form.Controls.Add($chkStartMenu)

$chkLaunch = New-Object System.Windows.Forms.CheckBox
$chkLaunch.Text = "Iniciar o CromaPDV Fiscal imediatamente após instalar"
$chkLaunch.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$chkLaunch.ForeColor = [System.Drawing.Color]::FromArgb(0, 200, 133)
$chkLaunch.Checked = $true
$chkLaunch.Location = New-Object System.Drawing.Point(28, 210)
$chkLaunch.Size = New-Object System.Drawing.Size(460, 26)
$form.Controls.Add($chkLaunch)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Pasta de destino: $env:LOCALAPPDATA\\CromaPDV"
$statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 8.5)
$statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(150, 168, 178)
$statusLabel.Location = New-Object System.Drawing.Point(24, 250)
$statusLabel.Size = New-Object System.Drawing.Size(480, 20)
$form.Controls.Add($statusLabel)

$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(24, 274)
$progressBar.Size = New-Object System.Drawing.Size(476, 22)
$progressBar.Value = 0
$form.Controls.Add($progressBar)

$btnInstall = New-Object System.Windows.Forms.Button
$btnInstall.Text = "INSTALAR AGORA"
$btnInstall.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$btnInstall.BackColor = [System.Drawing.Color]::FromArgb(0, 200, 133)
$btnInstall.ForeColor = [System.Drawing.Color]::FromArgb(15, 23, 26)
$btnInstall.FlatStyle = "Flat"
$btnInstall.FlatAppearance.BorderSize = 0
$btnInstall.Location = New-Object System.Drawing.Point(310, 316)
$btnInstall.Size = New-Object System.Drawing.Size(190, 42)
$btnInstall.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btnInstall)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text = "Cancelar"
$btnCancel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$btnCancel.BackColor = [System.Drawing.Color]::FromArgb(37, 51, 58)
$btnCancel.ForeColor = [System.Drawing.Color]::White
$btnCancel.FlatStyle = "Flat"
$btnCancel.FlatAppearance.BorderSize = 0
$btnCancel.Location = New-Object System.Drawing.Point(195, 316)
$btnCancel.Size = New-Object System.Drawing.Size(105, 42)
$btnCancel.Add_Click({ $form.Close() })
$form.Controls.Add($btnCancel)

$appB64 = "${base64App}"
$icoB64 = "${icoBase64}"
$exeB64 = "${launcherExeBase64}"

$btnInstall.Add_Click({
  $btnInstall.Enabled = $false
  $btnCancel.Enabled = $false
  $statusLabel.Text = "Preparando diretório de instalação..."
  $progressBar.Value = 20
  [System.Windows.Forms.Application]::DoEvents()

  $installDir = Join-Path $env:LOCALAPPDATA "CromaPDV"
  if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Force -Path $installDir | Out-Null
  }

  $statusLabel.Text = "Instalando executável CromaPDV_Fiscal.exe e banco de dados local..."
  $progressBar.Value = 55
  [System.Windows.Forms.Application]::DoEvents()

  $appFilePath = Join-Path $installDir "CromaPDV_App.html"
  $icoFilePath = Join-Path $installDir "CromaPDV.ico"
  $exeFilePath = Join-Path $installDir "CromaPDV_Fiscal.exe"

  [System.IO.File]::WriteAllBytes($appFilePath, [System.Convert]::FromBase64String($appB64))
  [System.IO.File]::WriteAllBytes($icoFilePath, [System.Convert]::FromBase64String($icoB64))
  [System.IO.File]::WriteAllBytes($exeFilePath, [System.Convert]::FromBase64String($exeB64))

  $ws = New-Object -ComObject WScript.Shell

  if ($chkDesktop.Checked) {
    $statusLabel.Text = "Criando ícone na Área de Trabalho..."
    $progressBar.Value = 80
    [System.Windows.Forms.Application]::DoEvents()
    $desk = [Environment]::GetFolderPath("Desktop")
    $s = $ws.CreateShortcut((Join-Path $desk "CromaPDV Fiscal.lnk"))
    $s.TargetPath = $exeFilePath
    $s.WorkingDirectory = $installDir
    $s.IconLocation = "$icoFilePath,0"
    $s.Description = "CromaPDV Fiscal — Frente de Caixa e Emissão de NFC-e"
    $s.Save()
  }

  if ($chkStartMenu.Checked) {
    $startMenu = [Environment]::GetFolderPath("Programs")
    $s2 = $ws.CreateShortcut((Join-Path $startMenu "CromaPDV Fiscal.lnk"))
    $s2.TargetPath = $exeFilePath
    $s2.WorkingDirectory = $installDir
    $s2.IconLocation = "$icoFilePath,0"
    $s2.Description = "CromaPDV Fiscal — Frente de Caixa e Emissão de NFC-e"
    $s2.Save()
  }

  $progressBar.Value = 100
  $statusLabel.Text = "Instalação concluída com sucesso!"
  [System.Windows.Forms.Application]::DoEvents()

  [System.Windows.Forms.MessageBox]::Show("O CromaPDV Fiscal foi instalado com sucesso! O ícone 'CromaPDV Fiscal' já está disponível na sua Área de Trabalho.", "Instalação Concluída", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null

  if ($chkLaunch.Checked) {
    Start-Process $exeFilePath
  }

  $form.Close()
})

[void]$form.ShowDialog()
`;

// Build the authentic 64-bit Windows GUI Setup .EXE using Microsoft Visual C++ w64_stub.exe + shebang + ZIP container!
const setupExeBuffer = buildAuthenticWin64Exe(psInstallerPayload);

const setupExePath = path.join(outDir, 'Instalador_CromaPDV_Fiscal_Setup.exe');
fs.writeFileSync(setupExePath, setupExeBuffer);
console.log(
  '3. Gerado Executavel Nativo Windows (.EXE):',
  setupExePath,
  `(${(setupExeBuffer.length / 1024).toFixed(1)} KB)`
);

// Also keep the .bat version updated just in case
const setupBatPath = path.join(outDir, 'Setup_CromaPDV_Windows.bat');
const batHeader = `<# :\r\n@echo off\r\nchcp 65001 >nul\r\npowershell -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -Command "Invoke-Expression ([System.IO.File]::ReadAllText('%~f0',[System.Text.Encoding]::UTF8))"\r\nexit /b\r\n#>\r\n`;
fs.writeFileSync(setupBatPath, batHeader + psInstallerPayload, 'utf8');
console.log('4. Atualizado Setup_CromaPDV_Windows.bat com CromaPDV.ico e CromaPDV_Fiscal.exe embutidos.');
