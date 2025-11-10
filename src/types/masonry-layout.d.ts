declare module "masonry-layout" {
  interface MasonryOptions {
    itemSelector?: string;
    columnWidth?: number | string | Element;
    percentPosition?: boolean;
    gutter?: number | string;
    fitWidth?: boolean;
    originLeft?: boolean;
    originTop?: boolean;
    containerStyle?: string | object;
    transitionDuration?: string;
    stagger?: number | string;
    resize?: boolean;
    initLayout?: boolean;
  }

  class Masonry {
    constructor(element: Element | string, options?: MasonryOptions);
    layout(): void;
    reloadItems(): void;
    destroy(): void;
    addItems(elements: Element | Element[] | NodeList): void;
    remove(elements: Element | Element[] | NodeList): void;
    appended(elements: Element | Element[] | NodeList): void;
    prepended(elements: Element | Element[] | NodeList): void;
    on(eventName: string, listener: (...args: any[]) => void): void;
    off(eventName: string, listener: (...args: any[]) => void): void;
    once(eventName: string, listener: (...args: any[]) => void): void;
  }

  export default Masonry;
}

