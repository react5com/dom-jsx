import { createContext, useContext } from '../src/jsx-runtime'

type Theme = { color: string }

const ThemeContext = createContext<Theme>({ color: 'black' })

function Title(props: { text: string }) {
  const theme = useContext(ThemeContext)
  return <h1 style={{ color: theme.color }}>{props.text}</h1>
}

export const page = (
  <ThemeContext.Provider value={{ color: 'red' }}>
    {() => <Title text="Hello" />}
  </ThemeContext.Provider>
)
