
"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { paymentService } from '@/lib/paymentService';
import type { PaymentSettings } from '@/lib/types';
import { Send, Copy } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface AddFundsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AddFundsDialog({ isOpen, onOpenChange }: AddFundsDialogProps) {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSettings(paymentService.getPaymentSettings());
    }
  }, [isOpen]);

  if (!settings) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Funds</DialogTitle>
          <DialogDescription>Follow the steps below to add funds to your account.</DialogDescription>
        </DialogHeader>
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
        <DialogFooter className="sm:justify-center">
          <Button asChild>
            <Link href={settings.telegramUrl} target="_blank" rel="noopener noreferrer">
              <Send className="mr-2" />
              Contact on Telegram
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
