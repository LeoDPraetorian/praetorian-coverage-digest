# Using shadcnblocks.com Examples

Production-ready blocks from shadcnblocks.com for rapid development.

## Workflow

1. **Visit:** https://www.shadcnblocks.com/blocks
2. **Navigate:** Select category from sidebar
3. **Preview:** Click block to see full preview
4. **Copy:** Click "Copy Code" button
5. **Paste:** Add to your component file
6. **Install:** Run any missing `npx shadcn@latest add` commands
7. **Customize:** Modify text, colors, and layout

## Hero Section Example

**Source:** shadcnblocks.com Hero category

```typescript
// app/components/hero.tsx

import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="container flex flex-col items-center gap-8 pt-20 pb-12">
      <h1 className="text-6xl font-bold text-center">
        Build amazing products
      </h1>
      <p className="text-xl text-muted-foreground text-center max-w-2xl">
        Get started with production-ready components built with shadcn/ui
      </p>
      <div className="flex gap-4">
        <Button size="lg">Get Started</Button>
        <Button size="lg" variant="outline">Learn More</Button>
      </div>
    </section>
  )
}
```

**Dependencies:**
```bash
npx shadcn@latest add button
```

**Usage:**
```typescript
import { Hero } from "@/components/hero"

export default function Home() {
  return <Hero />
}
```

## Pricing Section Example

**Source:** shadcnblocks.com Pricing category

```typescript
// app/components/pricing.tsx

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function Pricing() {
  return (
    <section className="container py-20">
      <h2 className="text-4xl font-bold text-center mb-12">
        Simple, transparent pricing
      </h2>
      <div className="grid md:grid-cols-3 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Starter</CardTitle>
            <CardDescription>Perfect for trying out</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">$9</div>
            <p className="text-sm text-muted-foreground">per month</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Get Started</Button>
          </CardFooter>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <Badge className="w-fit mb-2">Most Popular</Badge>
            <CardTitle>Pro</CardTitle>
            <CardDescription>For growing businesses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">$29</div>
            <p className="text-sm text-muted-foreground">per month</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Get Started</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enterprise</CardTitle>
            <CardDescription>For large organizations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">Custom</div>
            <p className="text-sm text-muted-foreground">contact us</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline">Contact Sales</Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}
```

**Dependencies:**
```bash
npx shadcn@latest add card button badge
```

## Feature Section Example

```typescript
// app/components/features.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Shield, Rocket } from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built for performance with optimized components.",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "Best practices baked in for security.",
  },
  {
    icon: Rocket,
    title: "Scale Easily",
    description: "Grows with your application needs.",
  },
]

export function Features() {
  return (
    <section className="container py-20">
      <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <feature.icon className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
```

**Dependencies:**
```bash
npx shadcn@latest add card
npm install lucide-react
```

## Complete Page Assembly

```typescript
// app/page.tsx

import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { Pricing } from "@/components/pricing"
import { Footer } from "@/components/footer"

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </>
  )
}
```

## Tips

- **Check dependencies:** Each block lists required shadcn/ui components
- **Start with layout:** Hero + Navbar + Footer gives instant structure
- **Combine blocks:** Mix features, testimonials, CTAs for full pages
- **Customize incrementally:** Get working first, then style
