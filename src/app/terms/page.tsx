import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Terms & Conditions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-muted-foreground">
        <p>Welcome to 9LIVE SPORTS CLUB. By registering and participating in our games, you agree to the following terms and conditions.</p>
        
        <h3 className="font-semibold text-lg text-foreground">1. Age Requirement</h3>
        <p>You must be 21 years of age or older to create an account and participate in any games on this platform. By creating an account, you confirm that you meet this age requirement. We reserve the right to request proof of age at any time.</p>

        <h3 className="font-semibold text-lg text-foreground">2. Account Responsibility</h3>
        <p>You are responsible for maintaining the confidentiality of your account information, including your password. You are responsible for all activities that occur under your account.</p>

        <h3 className="font-semibold text-lg text-foreground">3. Responsible Gaming</h3>
        <p>This platform is for entertainment purposes only. The games involve financial risk and can be addictive. Please play responsibly and only bet what you can afford to lose. We are not liable for any financial losses incurred.</p>
        
        <h3 className="font-semibold text-lg text-foreground">4. Prohibited Activities</h3>
        <p>Using any form of automation, bots, or scripts to play games is strictly prohibited. Any form of collusion or fraudulent activity will result in immediate account termination and forfeiture of any balance.</p>

        <h3 className="font-semibold text-lg text-foreground">5. Changes to Terms</h3>
        <p>We reserve the right to modify these terms and conditions at any time. It is your responsibility to review them periodically. Continued use of the platform constitutes acceptance of any new terms.</p>
      </CardContent>
    </Card>
  );
}
