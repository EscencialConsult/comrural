import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

// Suscribe al canal privado de Supabase Realtime Broadcast del usuario
// (`notifications:user:<id>` — trigger + policy ya armados del lado del
// backend en la migración 0034_notifications.sql, ver
// comrural_erp_backend/docs/notifications.md "Entrega en tiempo real"). El
// canal es `private: true` porque la policy sobre `realtime.messages` exige
// que `auth.uid()` coincida con el `<id>` del canal — así nadie puede
// suscribirse a la bandeja de otro usuario.
//
// El broadcast solo trae la fila cruda de `notification_recipients` (sin
// title/message/data — esas viven en `notifications`, tabla aparte) así que
// no sirve para pintar el ítem directo: `onNuevaNotificacion` es responsable
// de refrescar la bandeja real contra GET /notifications.
export function useNotificacionesTiempoReal(userId, onNuevaNotificacion) {
  useEffect(() => {
    if (!userId) return

    const canal = supabase
      .channel(`notifications:user:${userId}`, { config: { private: true } })
      .on('broadcast', { event: 'INSERT' }, () => {
        onNuevaNotificacion()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])
}
