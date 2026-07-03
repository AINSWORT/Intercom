import { useState } from 'react';
import { Client } from '@/api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/Components/UI/dialog';
import { Input } from '@/Components/UI/input';
import { Button } from '@/Components/UI/button';
import { Label } from '@/Components/UI/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import { Textarea } from '@/Components/UI/textarea';

export default function ClientFormDialog({ client, antennas, technicians, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: client?.full_name || '',
    phone: client?.phone || '',
    address: client?.address || '',
    antenna_id: client?.antenna_id || '',
    technician_email: client?.technician_email || '',
    bank_card_number: client?.bank_card_number || '',
    monthly_fee: client?.monthly_fee || '',
    plan: client?.plan || '',
    status: client?.status || 'Activo',
    installation_date: client?.installation_date || '',
    notes: client?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : undefined };
    if (client) {
      await Client.update(client.id, data);
    } else {
      await Client.create(data);
    }
    setSaving(false);
    onSaved();
  };

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Nombre completo *</Label>
            <Input value={form.full_name} onChange={e => updateForm('full_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Teléfono</Label>
              <Input value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
            </div>
            <div>
              <Label>Cuota mensual</Label>
              <Input type="number" value={form.monthly_fee} onChange={e => updateForm('monthly_fee', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Dirección *</Label>
            <Input value={form.address} onChange={e => updateForm('address', e.target.value)} />
          </div>
          <div>
            <Label>Plan</Label>
            <Input value={form.plan} onChange={e => updateForm('plan', e.target.value)} placeholder="Ej: 10Mbps, 20Mbps" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Antena *</Label>
              <Select value={form.antenna_id} onValueChange={v => updateForm('antenna_id', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {antennas.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Técnico *</Label>
              <Select value={form.technician_email} onValueChange={v => updateForm('technician_email', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {technicians.map(t => (
                    <SelectItem key={t.id} value={t.email}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Número de tarjeta bancaria</Label>
            <Input value={form.bank_card_number} onChange={e => updateForm('bank_card_number', e.target.value)} placeholder="XXXX XXXX XXXX XXXX" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => updateForm('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Suspendido">Suspendido</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de instalación</Label>
              <Input type="date" value={form.installation_date} onChange={e => updateForm('installation_date', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.full_name || !form.address || !form.antenna_id || !form.technician_email} className="flex-1">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}