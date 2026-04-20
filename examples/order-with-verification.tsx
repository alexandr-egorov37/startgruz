// Example: How to integrate PhoneVerification into order form
"use client";

import { useState } from 'react';
import PhoneVerification from '../components/PhoneVerificationNew';

export default function OrderForm() {
  const [showVerification, setShowVerification] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [orderData, setOrderData] = useState({
    description: '',
    address: '',
    // ... other fields
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verifiedPhone) {
      setShowVerification(true);
      return;
    }

    // Submit order with verified phone
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderData,
          phone: verifiedPhone,
          phone_verified: true
        })
      });

      if (response.ok) {
        alert('Заявка отправлена!');
        // Reset form
        setOrderData({ description: '', address: '' });
        setVerifiedPhone('');
      }
    } catch (error) {
      alert('Ошибка отправки заявки');
    }
  };

  const handlePhoneVerified = (phone: string) => {
    setVerifiedPhone(phone);
    setShowVerification(false);
    // Auto-submit order after verification
    setTimeout(() => {
      document.getElementById('order-form')?.dispatchEvent(
        new Event('submit', { cancelable: true })
      );
    }, 500);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Создать заявку</h1>
      
      <form id="order-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Описание заявки
          </label>
          <textarea
            value={orderData.description}
            onChange={(e) => setOrderData({...orderData, description: e.target.value})}
            className="w-full p-3 border rounded-lg"
            rows={3}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Адрес
          </label>
          <input
            type="text"
            value={orderData.address}
            onChange={(e) => setOrderData({...orderData, address: e.target.value})}
            className="w-full p-3 border rounded-lg"
            required
          />
        </div>

        {verifiedPhone && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✓ Телефон подтвержден: {verifiedPhone}
            </p>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          {verifiedPhone ? 'Отправить заявку' : 'Подтвердить номер телефона'}
        </button>
      </form>

      {showVerification && (
        <PhoneVerification
          onVerified={handlePhoneVerified}
          onCancel={() => setShowVerification(false)}
        />
      )}
    </div>
  );
}
