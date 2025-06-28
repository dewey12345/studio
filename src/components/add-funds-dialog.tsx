
"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { paymentService } from '@/lib/paymentService';
import type { PaymentSettings } from '@/lib/types';
import { Send } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';

interface AddFundsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AddFundsDialog({ isOpen, onOpenChange }: AddFundsDialogProps) {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
        if (isOpen) {
            setLoading(true);
            try {
                const fetchedSettings = await paymentService.getPaymentSettings();
                setSettings(fetchedSettings);
            } catch (error) {
                console.error("Failed to fetch payment settings", error);
            } finally {
                setLoading(false);
            }
        }
    };
    fetchSettings();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Funds</DialogTitle>
          <DialogDescription>Follow the steps below to add funds to your account.</DialogDescription>
        </DialogHeader>
        {loading ? (
            <div className="space-y-4 py-4">
                <div className="flex justify-center">
                    <Skeleton className="h-[250px] w-[250px] rounded-lg" />
                </div>
                <div className="space-y-2 text-sm text-center">
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-full mx-auto" />
                    <Skeleton className="h-3 w-5/6 mx-auto" />
                </div>
            </div>
        ) : settings && (
            <div className="space-y-4 py-4">
                <div className="flex justify-center">
                     <Image src={settings.qrCodeUrl} width={250} height={250} alt="Payment QR Code" data-ai-hint="payment qr" className="rounded-lg border p-2 bg-white" />
                </div>
                <div className="space-y-2 text-sm text-center">
                    <p><strong>Step 1:</strong> Scan the QR code above with your payment app.</p>
                    <p><strong>Step 2:</strong> Send a screenshot of the successful payment to our support team on Telegram.</p>
                    <p className="text-xs text-muted-foreground">Please ensure the UPI reference number, amount, and date are clearly visible in the screenshot.</p>
                </div>
            </div>
        )}
        <DialogFooter className="sm:justify-center">
          <Button asChild disabled={loading || !settings?.telegramUrl}>
            <Link href={settings?.telegramUrl || ''} target="_blank" rel="noopener noreferrer">
              <Send className="mr-2" />
              Contact on Telegram
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
