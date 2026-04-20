'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function OfferPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white/80">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/70 transition text-[11px] font-bold uppercase tracking-widest mb-8">
          <ChevronLeft className="w-3.5 h-3.5" />
          На главную
        </Link>

        <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-6">Публичная оферта</h1>

        <p className="mb-4 leading-relaxed">
          Настоящий сервис предоставляет доступ к информации о частных исполнителях (грузчики, переезды, такелаж и иные услуги).
        </p>
        <p className="mb-4 leading-relaxed">
          Пользователь пополняет внутренний баланс сайта для получения доступа к контактным данным исполнителей.
        </p>
        <p className="mb-8 leading-relaxed">
          Сервис не является исполнителем работ и не оказывает услуги перевозки, погрузки или иные услуги. Все договорённости пользователь заключает напрямую с выбранным исполнителем.
        </p>

        <div className="space-y-6 border-t border-white/[0.06] pt-8">
          <section>
            <h2 className="text-base font-black text-white uppercase tracking-widest mb-2">1. Предмет оферты</h2>
            <p className="leading-relaxed">Сервис предоставляет пользователю доступ к информации о частных исполнителях, включая их контактные данные.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-white uppercase tracking-widest mb-2">2. Момент оказания услуги</h2>
            <p className="leading-relaxed">Услуга считается оказанной в момент предоставления пользователю контактных данных исполнителя.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-white uppercase tracking-widest mb-2">3. Оплата</h2>
            <p className="leading-relaxed">Пополнение баланса осуществляется через платёжные системы, подключённые на сайте. Денежные средства используются для оплаты доступа к информации.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-white uppercase tracking-widest mb-2">4. Возврат средств</h2>
            <p className="leading-relaxed">Возврат средств не осуществляется после оказания услуги, за исключением случаев, предусмотренных действующим законодательством Российской Федерации.</p>
          </section>

          <section>
            <h2 className="text-base font-black text-white uppercase tracking-widest mb-2">5. Ответственность</h2>
            <p className="leading-relaxed">Сервис не несёт ответственности за качество, сроки и результат выполнения работ исполнителями. Пользователь самостоятельно принимает решение о взаимодействии с исполнителем.</p>
          </section>
        </div>

        <div id="contacts" className="border-t border-white/[0.06] pt-8 mt-10 space-y-2">
          <h2 className="text-base font-black text-white uppercase tracking-widest mb-4">Контакты</h2>
          <p><span className="text-white/40">Сервис:</span> Онлайн-платформа поиска исполнителей (грузчики, переезды, такелаж)</p>
          <p><span className="text-white/40">География услуг:</span> Российская Федерация</p>
          <p><span className="text-white/40">Телефон:</span> +7 (920) 350-77-78</p>
          <p><span className="text-white/40">Email:</span> master-shuya@mail.ru</p>
          <p><span className="text-white/40">Статус:</span> Самозанятый</p>
          <p><span className="text-white/40">ИНН:</span> 370603874675</p>
          <p><span className="text-white/40">Режим работы:</span> ежедневно 08:00–22:00</p>
        </div>

        <p className="mt-10 text-[13px] text-white/40 leading-relaxed border-t border-white/[0.06] pt-8">
          Сервис предоставляет доступ к информации о частных исполнителях и не является непосредственным исполнителем услуг.
        </p>
      </div>
    </div>
  );
}
