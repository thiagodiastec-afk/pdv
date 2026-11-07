import type { CashMovement } from './posData';

export interface CashClosing {
  id: string;
  createdAt: string;
  operatorName: string;
  openingId?: string;
  expected: number;
  counted: number;
  difference: number;
}

export function getShiftMovements(movements: CashMovement[]): CashMovement[] {
  const openingIndex = movements.findIndex(movement => movement.type === 'ABERTURA');
  return openingIndex === -1 ? movements : movements.slice(0, openingIndex + 1);
}

export function getCashBalance(movements: CashMovement[]): number {
  const cents = movements.reduce((total, movement) => {
    const amount = Math.round(movement.amount * 100);
    switch (movement.type) {
      case 'ABERTURA':
      case 'SUPRIMENTO':
        return total + amount;
      case 'SANGRIA':
        return total - amount;
      case 'VENDA':
        return movement.paymentMethod === 'DINHEIRO' ? total + amount : total;
      case 'ESTORNO':
        return movement.paymentMethod === 'DINHEIRO' ? total - amount : total;
    }
  }, 0);
  return cents / 100;
}
