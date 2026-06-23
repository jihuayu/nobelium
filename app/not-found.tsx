import ContainerServer from '@/components/ContainerServer'

export default function NotFound() {
  return (
    <ContainerServer>
      <h1 className="text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 text-center">404</h1>
      <p className="text-xl text-zinc-500 dark:text-zinc-400 text-center">Page not found</p>
    </ContainerServer>
  )
}
