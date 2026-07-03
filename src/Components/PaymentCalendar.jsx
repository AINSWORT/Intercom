import { useState } from 'react';
import { Payment } from '@/api/entities';
import { Check, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/Components/UI/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/Components/UI/dialog';
import { Input } from '@/Components/UI/input';
import { Label } from '@/Components/UI/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function PaymentCalendar({ clientId, payments, monthlyFee, onPaymentChange, canRegisterPayment }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [payDialog, setPayDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'Efectivo', notes: '' });

  const getPayment = (month) => payments.find(p => p.year === year && p.month === month);

  const openPayDialog = (month) => {
    setPayForm({ amount: monthlyFee || '', method: 'Efectivo', notes: '' });
    setPayDialog(month);
  };

  const registerPayment = async () => {
    setSaving(true);
    await Payment.create({
      client_id: clientId,
      year,
      month: payDialog,
      amount: Number(payForm.amount),
      method: payForm.method,
      payment_date: new Date().toISOString().split('T')[0],
      notes: payForm.notes,
    });
    setSaving(false);
    setPayDialog(null);
    onPaymentChange();
  };

  const deletePayment = async (paymentId) => {
    await Payment.delete(paymentId);
    onPaymentChange();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Calendario de Pagos</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setYear(y => y - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold text-sm min-w-[4rem] text-center">{year}</span>
          <Button variant="ghost" size="icon" onClick={() => setYear(y => y + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {MONTHS.map((name, idx) => {
          const month = idx + 1;
          const payment = getPayment(month);
          const isPaid = !!payment;
          const now = new Date();
          const isPast = year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth() + 1);

          return (
            <div
              key={month}
              className={`relative rounded-xl border-2 p-3 text-center transition-all ${
                isPaid
                  ? 'border-green-300 bg-green-50'
                  : isPast
                  ? 'border-red-200 bg-red-50'
                  : 'border-border bg-card'
              }`}
            >
              <p className="text-xs font-medium text-muted-foreground mb-1">{name}</p>
              {isPaid ? (
                <div>
                  <Check className="w-5 h-5 mx-auto text-green-600" />
                  <p className="text-xs font-semibold text-green-700 mt-1">${payment.amount}</p>
                  {canRegisterPayment && (
                    <button
                      onClick={() => deletePayment(payment.id)}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <X className="w-5 h-5 mx-auto text-muted-foreground/40" />
                  {canRegisterPayment && isPast && (
                    <button
                      onClick={() => openPayDialog(month)}
                      className="mt-1 text-xs text-primary hover:underline font-medium"
                    >
                      Registrar
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {payDialog && (
        <Dialog open onOpenChange={() => setPayDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Registrar Pago — {MONTHS[payDialog - 1]} {year}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Monto</Label>
                <Input
                  type="number"
                  value={payForm.amount}
                  onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Método de pago</Label>
                <Select value={payForm.method} onValueChange={v => setPayForm(p => ({ ...p, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Depósito">Depósito</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notas</Label>
                <Input value={payForm.notes} onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setPayDialog(null)} className="flex-1">Cancelar</Button>
                <Button onClick={registerPayment} disabled={saving || !payForm.amount} className="flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}