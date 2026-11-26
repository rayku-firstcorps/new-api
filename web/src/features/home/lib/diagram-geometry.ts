/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
export type DiagramGeometry = {
  w: number
  h: number
  /** App -> router. */
  inbound: string
  /** Router -> each target, same order as the target nodes. */
  outbound: string[]
}

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Build the connector paths from the live DOM, in container pixel space
 * (viewBox = container size), so the SVG stays aligned at every width. The
 * layout is detected from the DOM: when the router sits below the app node we
 * are in the stacked (mobile) layout.
 */
export function measureDiagram(
  container: HTMLElement,
  app: HTMLElement,
  sphere: HTMLElement,
  nodes: HTMLElement[]
): DiagramGeometry {
  const c = container.getBoundingClientRect()
  const rel = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    return {
      l: r.left - c.left,
      t: r.top - c.top,
      r: r.right - c.left,
      b: r.bottom - c.top,
      w: r.width,
      h: r.height,
    }
  }
  const a = rel(app)
  const s = rel(sphere)
  const sx = s.l + s.w / 2
  const sy = s.t + s.h / 2
  const vertical = s.t >= a.b - 1

  if (vertical) {
    // App (above) -> sphere top, then a trunk down the sphere's center line
    // with a rounded branch into each node.
    return {
      w: round1(c.width),
      h: round1(c.height),
      inbound: `M${round1(sx)} ${round1(a.b)} L${round1(sx)} ${round1(s.t)}`,
      outbound: nodes.map((el) => {
        const t = rel(el)
        const ty = t.t + t.h / 2
        const rad = Math.max(0, Math.min(14, t.l - sx, ty - s.b))
        return `M${round1(sx)} ${round1(s.b)} L${round1(sx)} ${round1(ty - rad)} Q${round1(sx)} ${round1(ty)} ${round1(sx + rad)} ${round1(ty)} L${round1(t.l)} ${round1(ty)}`
      }),
    }
  }

  const ay = a.t + a.h / 2
  return {
    w: round1(c.width),
    h: round1(c.height),
    inbound: `M${round1(a.r)} ${round1(ay)} L${round1(s.l)} ${round1(sy)}`,
    outbound: nodes.map((el) => {
      const t = rel(el)
      const ty = t.t + t.h / 2
      const dx = (t.l - s.r) / 2
      return `M${round1(s.r)} ${round1(sy)} C${round1(s.r + dx)} ${round1(sy)} ${round1(t.l - dx)} ${round1(ty)} ${round1(t.l)} ${round1(ty)}`
    }),
  }
}

export function isSameGeometry(
  a: DiagramGeometry | null,
  b: DiagramGeometry
): boolean {
  return (
    !!a &&
    a.w === b.w &&
    a.h === b.h &&
    a.inbound === b.inbound &&
    a.outbound.join() === b.outbound.join()
  )
}
