import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Save, 
  Trash2, 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  Plus, 
  RotateCcw,
  Check
} from 'lucide-react';
import { 
  db,
  updateWorkshopSettings, 
  exportDatabaseBackup, 
  importDatabaseBackup,
  resetPaymentMethodsToDefault
} from '../../db/dexie';
import { 
  injectSampleDataToDatabase, 
  wipeAllDataClean 
} from '../../db/seedData';
import { Modal } from '../common/Modal';
import { StatsPinSettings, DocCodesLegend } from '../security/StatsPin';
import type { WorkshopSettings, PaymentMethodItem, PaymentMethodType } from '../../types';
import { ask, notify } from '../common/Dialogs';

interface SettingsViewProps {
  settings: WorkshopSettings;
  onRefreshSettings: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onRefreshSettings,
}) => {
  const [formData, setFormData] = useState<WorkshopSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live query for payment methods inside settings
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray(), []) || [];

  // Modal for new payment method
  const [isMethodModalOpen, setIsMethodModalOpen] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodType, setNewMethodType] = useState<PaymentMethodType>('bank');

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateWorkshopSettings(formData);
    onRefreshSettings();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleToggleMethod = async (id: string, currentStatus: boolean) => {
    await db.paymentMethods.update(id, { isActive: !currentStatus });
  };

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodName.trim()) return;
    await db.paymentMethods.add({
      id: `pm-${Date.now()}`,
      name: newMethodName.trim(),
      type: newMethodType,
      isActive: true,
    });
    setNewMethodName('');
    setIsMethodModalOpen(false);
  };

  const handleResetMethods = async () => {
    if (await ask('استعادة الوسائل الافتراضية؟', { confirmLabel: 'استعادة', danger: false })) {
      await resetPaymentMethodsToDefault();
    }
  };

  const handleWipeClean = async () => {
    if (await ask('مسح كل البيانات نهائياً؟', { confirmLabel: 'مسح' })) {
      await wipeAllDataClean();
      window.location.reload();
    }
  };

  const handleInjectSample = async () => {
    if (await ask('إضافة بيانات تجريبية؟', { message: 'ستُستبدل البيانات الحالية', confirmLabel: 'إضافة' })) {
      await injectSampleDataToDatabase();
      window.location.reload();
    }
  };

  const handleExportBackup = async () => {
    const json = await exportDatabaseBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `منجرة_الإتقان_نسخة_احتياطية_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      const success = await importDatabaseBackup(content);
      if (success) {
        window.location.reload();
      } else {
        notify('الملف غير صالح للاستيراد');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-3 auto-rows-min max-w-5xl w-full mx-auto">
      {/* 1. Workshop Details Form */}
      <form onSubmit={handleSave} className="lg:col-span-2 bg-white p-3.5 sm:p-4 rounded-[4px] border border-slate-300 space-y-3 shadow-2xs">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <h2 className="font-bold text-slate-900 text-sm sm:text-base font-display">
            بيانات المنجرة
          </h2>
          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-[6px] font-semibold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              تم الحفظ
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">اسم المنجرة *</label>
            <input
              type="text"
              required
              value={formData.workshopName}
              onChange={(e) => setFormData({ ...formData, workshopName: e.target.value })}
              className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white font-semibold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">المسؤول *</label>
            <input
              type="text"
              required
              value={formData.managerName}
              onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
              className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">الهاتف</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white font-mono dir-ltr text-right"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">العنوان</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white text-slate-900"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            type="submit"
            className="h-8 inline-flex items-center gap-1.5 px-4 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ</span>
          </button>
        </div>
      </form>

      <StatsPinSettings settings={settings} />
      <DocCodesLegend />

      {/* 2. Payment Methods Section (Moved entirely to Settings) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-[4px] border border-slate-300 space-y-3 shadow-2xs">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base font-display">
              وسائل الدفع
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetMethods}
              className="h-7 inline-flex items-center gap-1 px-2.5 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              title="استعادة الوسائل الافتراضية"
            >
              <RotateCcw className="w-3 h-3" />
              <span>الافتراضي</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMethodModalOpen(true)}
              className="h-7 inline-flex items-center gap-1 px-3 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة</span>
            </button>
          </div>
        </div>

        {/* Methods List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
          {paymentMethods.map((m) => (
            <div
              key={m.id}
              onClick={() => handleToggleMethod(m.id, m.isActive)}
              className={`p-2.5 rounded-[4px] border flex items-center justify-between cursor-pointer transition-colors ${
                m.isActive
                  ? 'bg-emerald-50/60 border-emerald-300 text-slate-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-5 h-5 rounded-[4px] flex items-center justify-center border transition-colors ${
                    m.isActive
                      ? 'bg-[#166534] border-[#166534] text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {m.isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span className="font-semibold">{m.name}</span>
              </div>

              <span className="text-xs px-2 py-0.5 rounded-[4px] bg-white border border-slate-200 text-slate-600 font-sans">
                {m.type === 'cash' ? 'نقدي' : m.type === 'wallet' ? 'محفظة' : 'بنك'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Data Management & Clean State */}
      <div className="bg-white p-3.5 sm:p-4 rounded-[4px] border border-slate-300 space-y-3 shadow-2xs">
        <div className="border-b border-slate-200 pb-2.5">
          <h2 className="font-bold text-slate-900 text-sm sm:text-base font-display">
            البيانات
          </h2>
        </div>

        <div className="relative">
          {/* الأزرار الأصلية - مخفية بالطبقة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
            <button
              type="button"
              onClick={handleInjectSample}
              className="p-3 rounded-[4px] border border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/50 text-right transition-colors"
            >
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-700" />
                <span>بيانات تجريبية</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleWipeClean}
              className="p-3 rounded-[4px] border border-slate-300 hover:border-rose-600 hover:bg-rose-50/50 text-right transition-colors"
            >
              <div className="font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>مسح الكل</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleExportBackup}
              className="p-3 rounded-[4px] border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-right transition-colors"
            >
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-slate-600" />
                <span>تصدير نسخة</span>
              </div>
            </button>

            <label className="p-3 rounded-[4px] border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-right transition-colors cursor-pointer">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-slate-600" />
                <span>استيراد نسخة</span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportBackup}
                accept=".json"
                className="hidden"
              />
            </label>
          </div>

          {/* طبقة الإخفاء */}
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] rounded-[4px] flex items-center justify-center z-10">
            <span className="text-slate-400 text-xs sm:text-sm font-medium">غير متوفر حالياً</span>
          </div>
        </div>
      </div>

      {/* Modal for adding new payment method */}
      <Modal
        isOpen={isMethodModalOpen}
        onClose={() => setIsMethodModalOpen(false)}
        title="وسيلة دفع جديدة"
        maxWidth="sm"
      >
        <form onSubmit={handleAddMethod} className="space-y-3 text-xs sm:text-sm">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">الاسم *</label>
            <input
              type="text"
              required
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              
              className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">النوع</label>
            <select
              value={newMethodType}
              onChange={(e) => setNewMethodType(e.target.value as PaymentMethodType)}
              className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 bg-white text-slate-900"
            >
              <option value="bank">بنك</option>
              <option value="wallet">محفظة</option>
              <option value="cash">نقدي</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsMethodModalOpen(false)}
              className="px-3 py-1.5 rounded-[6px] border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white font-semibold"
            >
              إضافة
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
