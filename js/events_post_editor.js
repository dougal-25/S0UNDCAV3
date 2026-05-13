// EVENTS — post editor modal (variant picker + free-edit + regenerate)
// Loaded after events_detail. Wires postCard clicks via window.scEvents.openPostEditor.
(function () {
  const E = window.scEvents;
  const { API, h, authedFetch, fmtDate, MONO_LABEL } = E;

  // ── modal scaffolding ─────────────────────────────────
  function buildOverlay(panel) {
    const overlay = h('div', {
      style: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 400, padding: '24px',
      },
    }, panel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(overlay); });
    document.addEventListener('keydown', escHandler);
    function escHandler(e) { if (e.key === 'Escape') closeOverlay(overlay); }
    overlay._escHandler = escHandler;
    return overlay;
  }
  function closeOverlay(overlay) {
    document.removeEventListener('keydown', overlay._escHandler);
    overlay.remove();
  }

  // ── modal contents ────────────────────────────────────
  function openPostEditor(post, onSaved) {
    // Local working copy so cancel discards edits
    let variants = (post.copy_variants || []).map(v => ({ ...v }));
    if (!variants.length) variants = [{ id: 'v1', text: '' }];
    let selectedId = post.selected_copy_variant_id && variants.some(v => v.id === post.selected_copy_variant_id)
      ? post.selected_copy_variant_id
      : variants[0].id;

    let overlay; // forward ref so handlers can close it

    function selectedVariant() {
      return variants.find(v => v.id === selectedId) || variants[0];
    }

    function rerender() {
      const newPanel = buildPanel();
      overlay.replaceChildren(newPanel);
    }

    function buildPanel() {
      const header = h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' } }, [
        h('div', null, [
          h('div', { style: { ...MONO_LABEL, color: 'var(--red)' } }, post.post_type.replace(/_/g, ' ')),
          h('div', { style: { ...MONO_LABEL, fontSize: '9px', marginTop: '2px' } }, fmtDate(post.scheduled_for)),
        ]),
        h('button', {
          type: 'button', class: 'btn-outline',
          style: { padding: '4px 10px' },
          onClick: () => closeOverlay(overlay),
        }, '✕'),
      ]);

      const variantCards = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', marginBottom: '14px' } },
        variants.map((v, i) => h('div', {
          class: 'card',
          style: {
            borderColor: v.id === selectedId ? 'var(--red)' : 'var(--border)',
            cursor: 'pointer', padding: '10px 12px',
          },
          onClick: () => {
            // Commit any pending textarea edits to the *previous* selection first,
            // then switch. This keeps free-edits from being lost on variant flip.
            const ta = overlay.querySelector('textarea[data-role="copy"]');
            if (ta) {
              const prev = variants.find(x => x.id === selectedId);
              if (prev) prev.text = ta.value;
            }
            selectedId = v.id;
            rerender();
          },
        }, [
          h('div', {
            style: {
              fontFamily: 'var(--font-mono)', fontSize: '9px',
              color: v.id === selectedId ? 'var(--red)' : 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', marginBottom: '4px',
            },
          }, `VARIANT ${i + 1}${v.id === selectedId ? ' · SELECTED' : ''}`),
          h('div', { style: { fontSize: '11px', lineHeight: '1.45', color: 'var(--secondary)', maxHeight: '76px', overflow: 'hidden' } },
            (v.text || '').slice(0, 200)),
        ]))
      );

      const textarea = h('textarea', {
        class: 'input',
        rows: 8,
        style: { fontSize: '13px', lineHeight: '1.55', width: '100%' },
        'data-role': 'copy',
      });
      textarea.value = selectedVariant().text;

      const regenBtn = h('button', {
        type: 'button', class: 'btn-outline',
        onClick: async () => {
          regenBtn.disabled = true; regenBtn.textContent = '{REGENERATING…}';
          try {
            const r = await authedFetch(`${API}/api/posts/${post.id}/regenerate-copy`, { method: 'POST' });
            const j = await r.json();
            if (!r.ok) { alert(`Regen failed: ${j.error || r.status}`); regenBtn.disabled = false; regenBtn.textContent = '{REGENERATE}'; return; }
            // Refresh local state from server
            const fresh = j.post || {};
            variants = (fresh.copy_variants || []).map(v => ({ ...v }));
            if (!variants.length) variants = [{ id: 'v1', text: '' }];
            selectedId = fresh.selected_copy_variant_id || variants[0].id;
            rerender();
          } catch (e) {
            alert(`Regen failed: ${e.message}`);
            regenBtn.disabled = false; regenBtn.textContent = '{REGENERATE}';
          }
        },
      }, '{REGENERATE}');

      const saveBtn = h('button', {
        type: 'button', class: 'btn-red',
        onClick: async () => {
          // Persist textarea edits into the local selected variant
          const ta = overlay.querySelector('textarea[data-role="copy"]');
          const sel = variants.find(v => v.id === selectedId);
          if (sel && ta) sel.text = ta.value;
          saveBtn.disabled = true; saveBtn.textContent = '{SAVING…}';
          try {
            const r = await authedFetch(`${API}/api/posts/${post.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                copy_variants: variants,
                selected_copy_variant_id: selectedId,
              }),
            });
            const j = await r.json();
            if (!r.ok) { alert(`Save failed: ${j.error || r.status}`); saveBtn.disabled = false; saveBtn.textContent = '{SAVE}'; return; }
            closeOverlay(overlay);
            if (typeof onSaved === 'function') onSaved();
          } catch (e) {
            alert(`Save failed: ${e.message}`);
            saveBtn.disabled = false; saveBtn.textContent = '{SAVE}';
          }
        },
      }, '{SAVE}');

      const cancelBtn = h('button', {
        type: 'button', class: 'btn-outline',
        onClick: () => closeOverlay(overlay),
      }, '{CANCEL}');

      const buttonRow = h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '14px' } }, [
        regenBtn,
        h('div', { style: { display: 'flex', gap: '8px' } }, [cancelBtn, saveBtn]),
      ]);

      const imageUrl = post.selected_image_url || (post.image_asset_urls || [])[0];
      const imagePreview = imageUrl
        ? h('div', { style: { marginBottom: '14px', display: 'flex', justifyContent: 'center' } }, [
            h('img', { src: imageUrl, style: { maxWidth: '320px', width: '100%', borderRadius: '2px' } }),
          ])
        : null;

      return h('div', {
        class: 'card',
        style: {
          background: 'var(--card)', maxWidth: '720px', width: '100%',
          maxHeight: 'calc(100vh - 48px)', overflow: 'auto', padding: '20px 22px',
        },
      }, [
        header,
        imagePreview,
        h('div', { style: { ...MONO_LABEL, marginBottom: '6px' } },
          variants.length > 1 ? `VARIANTS — pick one (${variants.length} options)` : 'VARIANT'),
        variantCards,
        h('div', { style: { ...MONO_LABEL, marginBottom: '6px' } }, 'EDIT TEXT'),
        textarea,
        buttonRow,
      ]);
    }

    overlay = buildOverlay(buildPanel());
    document.body.appendChild(overlay);
  }

  E.openPostEditor = openPostEditor;
})();
