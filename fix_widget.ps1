
$content = Get-Content -Path static/widget.js -Raw
$pattern = "(?s)if\s*\(\s*rawText.*?botBubble\.innerHTML\s*=\s*mdHtml;\s*\}"
$replacement = @"
      if (rawText.toUpperCase().replace(/\s+/g,').includes("[TICKET_FORM_RENDER]")) {        
        botBubble.innerHTML = 
`<div style="border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2); padding: 12px; border-radius: 12px; font-family: inherit;">
            <h4 style="margin:0 0 4px 0; color: #a5b4fc; font-size: 14px;">?? Hasar / Eksik Bildirimi</h4>
            <p style="margin: 0 0 10px 0; color: #ccc; font-size: 12px;">Yetkiliye iletmek üzere bilgileri doldurun:</p>
            <input type="text" id="t-order" placeholder="Sipariş No (İsteğe bağlı)" style="width: 100%; box-sizing: border-box; padding: 8px; margin-bottom: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: white; font-size: 13px;" />
            <input type="text" id="t-product" placeholder="Hangi Ürün?" style="width: 100%; box-sizing: border-box; padding: 8px; margin-bottom: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: white; font-size: 13px;" />
            <textarea id="t-summary" placeholder="Sorunu kısaca açıklayın (kırık, vb.)" style="width: 100%; box-sizing: border-box; padding: 8px; margin-bottom: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: white; font-size: 13px; font-family: inherit;" rows="2"></textarea>
            <button id="t-submit" style="width: 100%; padding: 8px; border-radius: 6px; border: none; background: #6366f1; color: white; font-weight: 600; cursor: pointer; transition: 0.2s;">Talebi Gönder</button>
          </div>`;
        
        setTimeout(() => {
          const btn = botBubble.querySelector("#t-submit");
          if (btn) {
            btn.addEventListener("click", async () => {
              btn.disabled = true;
              btn.innerText = "İletiliyor...";
              const order = botBubble.querySelector("#t-order").value;
              const product = botBubble.querySelector("#t-product").value;
              const summary = botBubble.querySelector("#t-summary").value;
              
              if (!product || !summary) {
                btn.innerText = "Lütfen ürün adı ve sorunu yazın!";
                btn.style.background = "#ef4444";
                setTimeout(() => {
                  btn.disabled = false;
                  btn.innerText = "Talebi Gönder";
                  btn.style.background = "#6366f1";
                }, 2000);
                return;
              }

              try {
                await fetch(`${apiBase}/api/widget/${botId}/ticket`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    session_id: sessionId,
                    order_number: order,
                    product_name: product,
                    damage_summary: summary
                  })
                });
                botBubble.innerHTML = 
`<div style="padding: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; color: #34d399; text-align: center; font-size: 13px;">? Talebiniz destek ekibimize başarıyla iletildi! Numaranızı ve sorununuzu aldık.</div>`;
              } catch(e) {
                btn.innerText = "Hata oluştu!";
              }
            });
          }
        }, 150);
      } else {
        botBubble.innerHTML = mdHtml;
      }
"@
$content = $content -replace $pattern, $replacement
Set-Content -Path static/widget.js -Value $content -Encoding UTF8

