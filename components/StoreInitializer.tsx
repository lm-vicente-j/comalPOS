'use client';

import {  useRef } from 'react';
import { useUserStore } from '@/lib/store';

export default function StoreInitializer({ userId }: { userId: string }) {
const initialized = useRef(false);

  if (!initialized.current) {
    const numericId = Number(userId);
    if (!isNaN(numericId)) {
      useUserStore.getState().updateID(numericId);
    }
    initialized.current = true;
  }

  return null;
}