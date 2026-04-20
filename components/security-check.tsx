"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, Loader2 } from "lucide-react"

export function SecurityCheck() {
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState<"checking" | "suspicious" | "success">("checking")
  const [hiding, setHiding] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const last = localStorage.getItem("human_check_time")
    const now = Date.now()

    if (last && now - parseInt(last, 10) < 3600000) {
      return
    }

    setShow(true)
    document.body.classList.add("modal-open")

    let interacted = false
    const registerInteraction = () => {
      interacted = true
    }

    window.addEventListener("mousemove", registerInteraction, { once: true, passive: true })
    window.addEventListener("scroll", registerInteraction, { once: true, passive: true })
    window.addEventListener("touchstart", registerInteraction, { once: true, passive: true })

    const timer = setTimeout(() => {
       if (interacted) {
         setStatus("success")
         localStorage.setItem("human_check_time", Date.now().toString())
         setTimeout(() => closeOverlay(), 300)
       } else {
         setStatus("suspicious")
       }
    }, 12000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("mousemove", registerInteraction)
      window.removeEventListener("scroll", registerInteraction)
      window.removeEventListener("touchstart", registerInteraction)
      document.body.classList.remove("modal-open")
    }
  }, [mounted])

  const closeOverlay = () => {
    setHiding(true)
    setTimeout(() => {
      setShow(false)
      document.body.classList.remove("modal-open")
    }, 300)
  }

  const handleManualCheck = () => {
    setStatus("checking")
    setTimeout(() => {
      setStatus("success")
      localStorage.setItem("human_check_time", Date.now().toString())
      setTimeout(() => closeOverlay(), 600)
    }, 800)
  }

  if (!mounted || !show) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300 select-none ${hiding ? "opacity-0" : "opacity-100"} ${hiding || status === "success" ? "pointer-events-none" : ""}`}
    >
      <div className={`flex flex-col items-center justify-center transition-transform duration-300 ${hiding ? "scale-95" : "scale-100"}`}>
         {status === "checking" && (
           <div className="flex flex-col items-center animate-in zoom-in-95 duration-300">
             <Loader2 className="w-10 h-10 text-white/80 animate-spin mb-5" />
             <div className="text-white text-lg font-medium tracking-wide drop-shadow-md">Проверяем безопасность…</div>
           </div>
         )}
         {status === "success" && (
           <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
             <ShieldCheck className="w-12 h-12 text-green-400 mb-5 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
             <div className="text-white text-lg font-medium tracking-wide drop-shadow-md">Проверка пройдена</div>
           </div>
         )}
         {status === "suspicious" && (
           <div className="bg-[#1f1f1f] p-8 rounded-2xl flex flex-col items-center border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="text-white text-xl font-bold mb-2">Подтвердите, что вы человек</div>
             <p className="text-muted-foreground text-sm mb-8 text-center max-w-[280px]">Мы обнаружили подозрительную активность</p>
             <button
               onClick={handleManualCheck}
               className="bg-[#1db939] hover:bg-[#19a532] text-white px-8 py-3 w-full rounded-xl text-sm font-bold transition-all shadow-[0_4px_10px_rgba(29,185,57,0.3)] active:scale-95"
             >
               Я не робот
             </button>
           </div>
         )}
      </div>
    </div>
  )
}
