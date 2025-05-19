"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebaseConfig";
import { EventInput } from "@fullcalendar/core";

export default function Calendario() {
  const [eventos, setEventos] = useState<EventInput[]>([]);
  const [altura, setAltura] = useState<string>("700px");

  const buscarAgendamentos = useCallback(async () => {
    const agendamentosRef = collection(db, "agendamentos");
    const snapshot = await getDocs(agendamentosRef);
    const dados: EventInput[] = [];
    snapshot.forEach((doc) => {
      const data = doc.id;
      const horarios = doc.data();
      Object.keys(horarios).forEach((hora) => {
        dados.push({
          title: `${horarios[hora].servico} - ${horarios[hora].cliente}`,
          date: `${data}T${hora}`,
        });
      });
    });
    setEventos(dados);
  }, []);

  const aoMudarView = useCallback((arg: { view: { type: string } }) => {
    if (arg.view.type === "dayGridMonth") {
      setAltura("900px");
    } else {
      setAltura("700px");
    }
  }, []);

  const classeDia = (arg: { date: Date }) => {
    if (arg.date.getDay() === 0) {
      return ["domingo-fechado"];
    }
    return ["dia-calendario"];
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={ptBrLocale}
        events={eventos}
        dateClick={(info) => {
          if (info.date.getDay() === 0) {
            alert("Domingo está fechado! Não é possível agendar.");
            return;
          }
          alert(`Clique no dia: ${info.dateStr}`);
        }}
        eventColor="#3b82f6"
        eventTextColor="#fff"
        nowIndicator
        datesSet={buscarAgendamentos}
        viewDidMount={aoMudarView}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        slotLabelInterval="00:30:00"
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        height={altura}
        dayCellClassNames={classeDia}
      />
    </div>
  );
}
