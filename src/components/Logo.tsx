/** Logo do app (mesmo desenho de public/icon.svg). */
export function Logo({ className }: { className?: string }) {
  return <img src="/icon.svg" alt="" className={className} draggable={false} />
}
