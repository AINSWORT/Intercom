import { useState } from 'react';
import { Antenna } from '@/api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/Components/UI/dialog';
import { Input } from '@/Components/UI/input';
import { Button } from '@/Components/UI/button';
import { Label } from '@/Components/UI/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import { Textarea } from '@/Components/UI/textarea';

export default function AntennaFormDialog({ antenna, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: antenna?.name || '',
    location: antenna?.location || '',
    type: antenna?.type || 'Sectorial',
    status: antenna?.status || 'Activa',
    notes: antenna?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    if (antenna) {
      await Antenna.update(antenna.id, form);
    } else {
      await Antenna.create(form);
    }
    setSaving(false);
    onSaved();
  };

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{antenna ? 'Editar Antena' : 'Nueva Antena'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Ej: Antena Norte" />
          </div>
          <div>
            <Label>Ubicación *</Label>
            <Input value={form.location} onChange={e => updateForm('location', e.target.value)} placeholder="Ej: Torre central, Col. Centro" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={v => updateForm('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sectorial">Sectorial</SelectItem>
                  <SelectItem value="Omnidireccional">Omnidireccional</SelectItem>
                  <SelectItem value="Punto a Punto">Punto a Punto</SelectItem>
                  <SelectItem value="Otra">Otra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={v => updateForm('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activa">Activa</SelectItem>
                  <SelectItem value="Inactiva">Inactiva</SelectItem>
                  <SelectItem value="En mantenimiento">En mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.location} className="flex-1">
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}