-- seido-filter.lua — Pandoc Lua filter for SEIDO Word documents
-- Enhances markdown→docx conversion with SEIDO-specific formatting

-- Add page break before each H1 (except the first)
local first_h1 = true
function Header(el)
  if el.level == 1 then
    if first_h1 then
      first_h1 = false
      return el
    else
      -- Insert page break before H1
      local pagebreak = pandoc.RawBlock('openxml',
        '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
      return { pagebreak, el }
    end
  end
  return el
end

-- Style blockquotes as "Note" callouts (italic + border)
function BlockQuote(el)
  -- Wrap content in emphasis for visual distinction in Word
  local blocks = el.content
  return blocks
end

-- Clean up horizontal rules → page section dividers
function HorizontalRule()
  return pandoc.RawBlock('openxml',
    '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="1B4F72"/></w:pBdr></w:pPr></w:p>')
end
