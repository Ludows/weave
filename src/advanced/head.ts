/**
 * head() document metadata management
 * 
 * Manages document title, meta tags, and link tags reactively.
 * Captures initial state and restores on destruction.
 */

import { createReactiveEffect } from '../core/dependency-tracker';

export interface HeadConfig {
  title?: string | (() => string);
  meta?: Record<string, string | (() => string)>;
  link?: Partial<Record<'canonical' | 'alternate' | 'prev' | 'next', string | (() => string)>>;
}

interface HeadSnapshot {
  title: string;
  meta: Map<string, string>;
  link: Map<string, string>;
}

interface HeadManager {
  instances: Map<any, HeadSnapshot>;
  currentState: HeadSnapshot;
  initialState: HeadSnapshot;
}

// Global head manager
const headManager: HeadManager = {
  instances: new Map(),
  currentState: {
    title: '',
    meta: new Map(),
    link: new Map()
  },
  initialState: {
    title: '',
    meta: new Map(),
    link: new Map()
  }
};

// Capture initial state on first use
let initialStateCaptured = false;

function captureInitialState(): void {
  if (initialStateCaptured) return;
  
  headManager.initialState.title = document.title;
  
  // Capture all meta tags
  document.querySelectorAll('meta').forEach(meta => {
    const name = meta.getAttribute('name') || meta.getAttribute('property');
    if (name) {
      headManager.initialState.meta.set(name, meta.getAttribute('content') || '');
    }
  });
  
  // Capture all link tags
  document.querySelectorAll('link[rel]').forEach(link => {
    const rel = link.getAttribute('rel');
    if (rel && ['canonical', 'alternate', 'prev', 'next'].includes(rel)) {
      headManager.initialState.link.set(rel, link.getAttribute('href') || '');
    }
  });
  
  initialStateCaptured = true;
}

function updateTitle(title: string): void {
  document.title = title;
  headManager.currentState.title = title;
}

function updateMetaTag(key: string, value: string): void {
  // Determine if we should use property or name attribute
  const useProperty = key.startsWith('og:') || key.startsWith('twitter:') || 
                      key.startsWith('article:') || key.startsWith('fb:');
  
  const attribute = useProperty ? 'property' : 'name';
  let meta = document.querySelector(`meta[${attribute}="${key}"]`);
  
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  
  meta.setAttribute('content', value);
  headManager.currentState.meta.set(key, value);
}

function updateLinkTag(rel: string, href: string): void {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.appendChild(link);
  }
  
  link.setAttribute('href', href);
  headManager.currentState.link.set(rel, href);
}

export function createHeadManager(instance: any, config: HeadConfig, cleanupFns: (() => void)[]): void {
  captureInitialState();
  
  // Capture state before this instance modifies it
  const snapshot: HeadSnapshot = {
    title: headManager.currentState.title || document.title,
    meta: new Map(headManager.currentState.meta),
    link: new Map(headManager.currentState.link)
  };
  
  headManager.instances.set(instance, snapshot);
  
  // Handle title
  if (config.title !== undefined) {
    if (typeof config.title === 'function') {
      const effect = createReactiveEffect(() => {
        const title = config.title as () => string;
        updateTitle(title());
      });
      cleanupFns.push(() => {
        effect.deps.forEach(dep => dep.effects.delete(effect));
        effect.deps.clear();
      });
    } else {
      updateTitle(config.title);
    }
  }
  
  // Handle meta tags
  if (config.meta) {
    for (const [key, value] of Object.entries(config.meta)) {
      if (typeof value === 'function') {
        const effect = createReactiveEffect(() => {
          updateMetaTag(key, value());
        });
        cleanupFns.push(() => {
          effect.deps.forEach(dep => dep.effects.delete(effect));
          effect.deps.clear();
        });
      } else {
        updateMetaTag(key, value);
      }
    }
  }
  
  // Handle link tags
  if (config.link) {
    for (const [rel, href] of Object.entries(config.link)) {
      if (href !== undefined) {
        if (typeof href === 'function') {
          const effect = createReactiveEffect(() => {
            updateLinkTag(rel, href());
          });
          cleanupFns.push(() => {
            effect.deps.forEach(dep => dep.effects.delete(effect));
            effect.deps.clear();
          });
        } else {
          updateLinkTag(rel, href);
        }
      }
    }
  }
  
  // Register cleanup to restore state
  cleanupFns.push(() => {
    const instanceSnapshot = headManager.instances.get(instance);
    if (instanceSnapshot) {
      // Restore to the state before this instance
      updateTitle(instanceSnapshot.title);
      
      // Restore meta tags
      for (const [key, value] of instanceSnapshot.meta) {
        updateMetaTag(key, value);
      }
      
      // Restore link tags
      for (const [rel, href] of instanceSnapshot.link) {
        updateLinkTag(rel, href);
      }
      
      headManager.instances.delete(instance);
    }
  });
}

export function resetHead(_instance: any): void {
  // Restore to initial page state
  updateTitle(headManager.initialState.title);
  
  // Restore meta tags
  for (const [key, value] of headManager.initialState.meta) {
    updateMetaTag(key, value);
  }
  
  // Restore link tags
  for (const [rel, href] of headManager.initialState.link) {
    updateLinkTag(rel, href);
  }
}

export function head() {
  // This is a placeholder - actual implementation is in createHeadManager
  // which is called from the weave context
  throw new Error('head() must be called within a weave() callback');
}
