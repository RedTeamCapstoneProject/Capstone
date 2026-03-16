export type BreakpointList = { [key: string]: string[] | string };

const breakpoints = (function () {
  const t: any = {
    list: null as BreakpointList | null,
    media: {} as { [key: string]: string | boolean },
    events: [] as { query: string; handler: () => void; state: boolean }[],

    init: function (list: BreakpointList) {
      t.list = list;
      window.addEventListener("resize", t.poll);
      window.addEventListener("orientationchange", t.poll);
      window.addEventListener("load", t.poll);
      window.addEventListener("fullscreenchange", t.poll);
    },

    active: function (query: string): boolean {
      if (!(query in t.media)) {
        t.media[query] = window.matchMedia(query).matches;
      }
      return t.media[query] as boolean;
    },

    on: function (query: string, handler: () => void) {
      t.events.push({ query, handler, state: false });
      if (t.active(query)) handler();
    },

    poll: function () {
      for (let i = 0; i < t.events.length; i++) {
        const e = t.events[i];
        if (t.active(e.query)) {
          if (!e.state) {
            e.state = true;
            e.handler();
          }
        } else {
          e.state = false;
        }
      }
    },
  };

  const fn = (list: BreakpointList) => t.init(list);
  fn.on = (query: string, handler: () => void) => t.on(query, handler);
  fn.active = (query: string) => t.active(query);

  return fn;
})();
export default breakpoints;