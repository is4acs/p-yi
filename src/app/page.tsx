import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="mx-auto max-w-md px-4 py-8 sm:max-w-2xl sm:py-12">
      <header className="mb-8">
        <p className="text-sm font-medium text-peyi-orange-600">
          Bienvenue sur
        </p>
        <h1 className="font-display text-5xl font-bold tracking-tight text-foreground">
          Péyi
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Les bons plans et petites annonces, 100% Guyane.
        </p>
      </header>

      <section className="mb-8 flex flex-wrap gap-2">
        <Badge className="bg-peyi-orange-500 text-white hover:bg-peyi-orange-600">
          Bons plans
        </Badge>
        <Badge className="bg-peyi-green-500 text-peyi-green-900 hover:bg-peyi-green-600">
          Petites annonces
        </Badge>
        <Badge variant="outline">22 communes</Badge>
      </section>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="font-display">
            Setup design system ✅
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Police titres : <span className="font-display font-bold">Plus Jakarta Sans</span>
          </p>
          <p>
            Police corps : <span className="font-bold">Inter</span>
          </p>
          <div className="flex gap-2">
            <div className="h-10 flex-1 rounded-lg bg-peyi-orange-500" aria-label="Orange Péyi" />
            <div className="h-10 flex-1 rounded-lg bg-peyi-green-500" aria-label="Vert Péyi" />
            <div className="h-10 w-10 rounded-lg bg-hot" aria-label="Hot" />
            <div className="h-10 w-10 rounded-lg bg-cold" aria-label="Cold" />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button className="w-full sm:w-auto">Découvrir les bons plans</Button>
        <Button variant="secondary" className="w-full sm:w-auto">
          Poster une annonce
        </Button>
      </div>
    </main>
  );
}
