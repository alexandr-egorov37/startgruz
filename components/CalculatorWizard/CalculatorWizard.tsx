"use client"

import { useState, useEffect } from "react"
import { 
  Truck, 
  Users, 
  CheckCircle2, 
} from "lucide-react"
import { cn } from "../../lib/utils"
import Link from "next/link"
import Loaders from "../Calculator/Loaders"
import Gasel from "../Calculator/Gasel"

type ServiceType = "Workers" | "Gazelle" | null

export default function CalculatorWizard() {
  const [step, setStep] = useState(1)
  const [type, setType] = useState<ServiceType>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [city, setCity] = useState("Шуя")

  useEffect(() => {
    const savedCity = localStorage.getItem('user_city')
    if (savedCity) setCity(savedCity)
    
    // Listen for city changes in localStorage (if any other component updates it)
    const handleStorage = () => {
      const c = localStorage.getItem('user_city')
      if (c) setCity(c)
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const reset = () => {
    setStep(1)
    setType(null)
    setSuccess(false)
  }

  const handleFinalSubmit = async (data: any) => {
    setLoading(true)
    try {
      const { sendToTelegram } = await import("../../lib/telegram")
      let message = `<b>🚛 НОВАЯ ЗАЯВКА</b>\n\n`
      message += `📍 <b>Город:</b> ${city}\n`
      
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'phone') return;
        message += `🔹 <b>${key}:</b> ${value}\n`
      })
      
      message += `\n📞 <b>Телефон:</b> <code>${data.phone}</code>`
      
      await sendToTelegram(message)
      setSuccess(true)
    } catch (e) {
      console.error(e)
      alert("Ошибка при отправке. Попробуйте позже.")
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="text-center p-12 bg-white rounded-xl border border-gray-200 shadow-sm">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Заявка принята!</h2>
        <p className="text-gray-500 mb-8">Наш менеджер свяжется с вами в течение 5 минут</p>
        <button 
          onClick={reset} 
          className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          Вернуться назад
        </button>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-lg px-4 py-8" id="calculator">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">

        {step === 1 ? (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2">
              <span className="border border-gray-300 rounded px-3 py-1 text-sm font-medium text-gray-900">Заказчик</span>
              <Link href="/performer/dashboard" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Я — Исполнитель</Link>
            </div>

            {/* Heading */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Что нужно сделать?</h1>
              <p className="text-gray-500 text-sm mt-2">Выберите направление работы</p>
            </div>

            {/* Service cards */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => { setType("Workers"); setStep(2); }} 
                className="group flex flex-col items-center text-center border border-gray-200 rounded-xl p-6 hover:border-gray-400 transition-colors"
              >
                <Users className="h-8 w-8 text-gray-700 mb-3" />
                <h3 className="text-base font-bold text-gray-900 uppercase">Грузчики</h3>
                <p className="text-gray-400 text-xs mt-1">Переезд, Сборка мебели, Такелаж</p>
                <span className="mt-3 text-sm font-semibold text-gray-500 group-hover:text-gray-900 transition-colors">ВЫБРАТЬ →</span>
              </button>

              <button 
                onClick={() => { setType("Gazelle"); setStep(2); }} 
                className="group flex flex-col items-center text-center border border-gray-200 rounded-xl p-6 hover:border-gray-400 transition-colors"
              >
                <Truck className="h-8 w-8 text-gray-700 mb-3" />
                <h3 className="text-base font-bold text-gray-900 uppercase">Газель</h3>
                <p className="text-gray-400 text-xs mt-1">По городу и Межгород</p>
                <span className="mt-3 text-sm font-semibold text-gray-500 group-hover:text-gray-900 transition-colors">ВЫБРАТЬ →</span>
              </button>
            </div>

            {/* Performer link */}
            <div>
              <Link href="/performer/dashboard" className="inline-block border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors">
                Личный кабинет исполнителя
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {type === "Workers" && (
              <Loaders onBack={() => setStep(1)} city={city} onSumbit={handleFinalSubmit} />
            )}
            {type === "Gazelle" && (
              <Gasel onBack={() => setStep(1)} city={city} onSumbit={handleFinalSubmit} />
            )}
            
            {loading && (
              <div className="absolute inset-0 bg-white/80 z-[100] flex items-center justify-center rounded-xl">
                <div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
