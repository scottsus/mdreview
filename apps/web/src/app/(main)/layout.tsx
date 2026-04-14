import { Navbar } from "@/components/layout/navbar"

console.log("[main-layout] (main) layout module loaded")

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log("[main-layout] MainLayout rendering — will include Navbar")
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
