import { OverlayRenderer } from '@/content-overlay';

describe('OverlayRenderer', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '<head></head><body></body>';
  });

  it('renders untrusted lookup text as text, not HTML', () => {
    const renderer = new OverlayRenderer();
    renderer.render({
      word: '<img src=x onerror=alert(1)>',
      meanings: ['<script>alert(1)</script>'],
      fomoMessage: '<b>upgrade</b>',
      x: 10,
      y: 10,
    });

    const host = document.getElementById('ai-english-study-overlay-host');
    const root = host?.shadowRoot;

    expect(root).toBeTruthy();
    expect(root?.querySelector('img')).toBeNull();
    expect(root?.querySelector('script')).toBeNull();
    expect(root?.querySelector('b')).toBeNull();
    expect(root?.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(root?.textContent).toContain('<script>alert(1)</script>');
    expect(root?.textContent).toContain('<b>upgrade</b>');
  });
});
