import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

export default function DisclaimerPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Disclaimer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-muted-foreground">
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>High Risk Warning</AlertTitle>
          <AlertDescription>
            Participation in the games offered on this platform involves a significant element of financial risk and may not be suitable for all individuals. The games are games of chance and there is no guarantee of winning.
          </AlertDescription>
        </Alert>

        <h3 className="font-semibold text-lg text-foreground">1. No Financial Advice</h3>
        <p>The information provided on this website does not constitute investment advice, financial advice, trading advice, or any other sort of advice and you should not treat any of the website's content as such. 9LIVE SPORTS CLUB does not recommend that any currency should be bought, sold, or held by you.</p>

        <h3 className="font-semibold text-lg text-foreground">2. Risk of Loss</h3>
        <p>By using this platform, you acknowledge and agree that you are aware of the risks associated with games of chance and that you are assuming all responsibility for any losses that may result. You agree to hold 9LIVE SPORTS CLUB harmless from any and all losses you may incur.</p>

        <h3 className="font-semibold text-lg text-foreground">3. Addiction</h3>
        <p>Gaming can be addictive. If you feel you may have a gambling problem, we urge you to seek help. Please play responsibly.</p>
      </CardContent>
    </Card>
  );
}
