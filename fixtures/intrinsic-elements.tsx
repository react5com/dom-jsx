/** Compile-time fixture for the standard HTML intrinsic element map. */
export const elements = (
  <main className={Math.random() > 0.5 ? 'layout' : undefined}>
    <dialog open />
    <nav />
    <img alt="example" />
    <table><tbody><tr><td>Cell</td></tr></tbody></table>
    <video controls><source src="example.mp4" /></video>
  </main>
)
