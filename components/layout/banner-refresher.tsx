"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { refresh } from 'next/cache';

export default function BannerRefresher({ interval = 30000 }: { interval?: number }){
     const router = useRouter();
     useEffect(() => {
        const id  = setInterval(()=> router.reload(), interval);
        return () => clearInterval(id);
     }, [router, interval]);
     return null;

}