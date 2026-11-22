import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@veyro/ui';
import { landingFaq } from '@/lib/public-policy';

export function Faq() {
  return (
    <section id="faq" className="py-16 sm:py-24">
      <div className="mx-auto grid max-w-content gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-night-accent">
            FAQ
          </p>
          <h2 className="mt-4 font-display text-3xl font-bold text-night-text sm:text-4xl">
            Good questions.
          </h2>
          <p className="mt-4 max-w-md text-night-muted">
            Still unsure? The booking studio shows the applicable policy
            version and quote snapshot before you confirm.
          </p>
          <Link
            href="/auth?role=customer"
            className="mt-6 inline-block text-sm font-semibold text-night-accent underline-offset-4 hover:underline"
          >
            Get started →
          </Link>
        </div>
        <div className="rounded-card border border-night-border bg-night-surface px-5 sm:px-6">
          <Accordion type="single" collapsible className="[&>*:last-child]:border-b-0">
            {landingFaq.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
