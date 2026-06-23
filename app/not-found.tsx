import ContainerServer from '@/components/ContainerServer'

export default function NotFound() {
  return (
    <ContainerServer>
      <h1 className="text-5xl font-serif font-semibold tracking-tight text-stone-900 dark:text-stone-100 text-center">404</h1>
      <p className="text-xl text-stone-500 dark:text-stone-400 text-center">Page not found</p>
    </ContainerServer>
  )
}
