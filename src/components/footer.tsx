import Link from 'next/link';
import { Separator } from './ui/separator';

export default function Footer() {
  return (
    <footer className="mt-auto border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-muted-foreground text-sm">
        <div className="flex justify-center gap-4 mb-4">
          <Link href="/terms" className="hover:underline">Terms & Conditions</Link>
          <Separator orientation="vertical" className="h-5" />
          <Link href="/disclaimer" className="hover:underline">Disclaimer</Link>
        </div>
        <p className="mb-2">
            Disclaimer: This game involves an element of financial risk and may be addictive. Please play responsibly and at your own risk. This game is intended for users who are 21 years or older.
        </p>
        <p>&copy; {new Date().getFullYear()} 9LIVE SPORTS CLUB. All rights reserved.</p>
      </div>
    </footer>
  );
}
