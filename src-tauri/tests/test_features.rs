use tauri_app_lib::db;
use std::fs;
use typst_as_lib::TypstEngine;

#[test]
fn test_sqlite_indexing_and_graph() {
    let temp_dir = std::env::temp_dir().join("zentauri_test_workspace");
    let _ = fs::remove_dir_all(&temp_dir);
    fs::create_dir_all(&temp_dir).unwrap();

    // Create 3 interconnected scholarly markdown files
    let doc1 = r#"---
title: "Pāṇini Grammatik Einführung"
iast: "Aṣṭādhyāyī"
devanagari: "अष्टाध्यायी"
tags: ["sanskrit", "grammar"]
---

# Pāṇini Einführung
Siehe auch [[Sanskrit Vokale]] und das Dokument [Konsonantensystem](./konsonanten.md).
"#;

    let doc2 = r#"---
title: "Sanskrit Vokale"
iast: "Svara"
devanagari: "स्वर"
tags: ["phonetics"]
---

# Die Vokale im Sanskrit
Verbindung zurück zu [[Pāṇini Einführung]].
"#;

    let doc3 = r#"---
title: "Konsonantensystem"
iast: "Vyañjana"
devanagari: "व्यञ्जन"
tags: ["phonetics"]
---

# Das Konsonantensystem
Hier werden die 33 Konsonanten beschrieben.
"#;

    fs::write(temp_dir.join("panini.md"), doc1).unwrap();
    fs::write(temp_dir.join("vokale.md"), doc2).unwrap();
    fs::write(temp_dir.join("konsonanten.md"), doc3).unwrap();

    let sub_dir = temp_dir.join("subfolder");
    fs::create_dir_all(&sub_dir).unwrap();
    fs::write(sub_dir.join("nested.md"), "# Nested Chapter\nNested notes.").unwrap();

    // 1. Initialize DB and Index
    let mut conn = db::init_db(temp_dir.to_str().unwrap()).expect("Init DB failed");
    db::index_workspace(&mut conn, temp_dir.to_str().unwrap()).expect("Index workspace failed");

    // 2. Test reading root workspace tree
    let root_tree = db::read_workspace_tree_db(&conn, temp_dir.to_str().unwrap(), "name-asc").expect("Read root tree failed");
    // Should have 3 md files + 1 subfolder = 4 entries
    assert_eq!(root_tree.len(), 4, "Expected 4 entries in root tree (3 files + 1 subfolder)");

    let panini_node = root_tree.iter().find(|n| n.name == "panini.md").expect("panini.md not found");
    assert_eq!(panini_node.title.as_deref(), Some("Pāṇini Grammatik Einführung"));
    assert_eq!(panini_node.iast.as_deref(), Some("Aṣṭādhyāyī"));
    assert_eq!(panini_node.devanagari.as_deref(), Some("अष्टाध्यायी"));

    // 3. Test reading subfolder tree
    let sub_tree = db::read_workspace_tree_db(&conn, sub_dir.to_str().unwrap(), "name-asc").expect("Read subfolder tree failed");
    assert_eq!(sub_tree.len(), 1, "Expected 1 entry in subfolder");
    assert_eq!(sub_tree[0].name, "nested.md");
    assert_eq!(sub_tree[0].title.as_deref(), Some("Nested Chapter"));

    // 4. Test Knowledge Graph Data (contains all markdown files)
    let graph = db::get_graph_data_db(&conn).expect("Get graph data failed");
    assert_eq!(graph.nodes.len(), 4, "Expected 4 nodes in graph (including nested)");
    assert_eq!(graph.edges.len(), 3, "Expected 3 link connections in graph");

    // 5. Test Scoped Search with LIKE escaping
    let search_all = db::search_files_db(&conn, "Panini", temp_dir.to_str().unwrap()).expect("Search failed");
    assert_eq!(search_all.len(), 1, "Expected 1 search match for Panini in root scope");
    assert_eq!(search_all[0].name, "panini.md");

    let search_scoped = db::search_files_db(&conn, "Panini", sub_dir.to_str().unwrap()).expect("Search failed");
    assert_eq!(search_scoped.len(), 0, "Panini should not match in sub_dir scope");

    let search_nested = db::search_files_db(&conn, "Nested", sub_dir.to_str().unwrap()).expect("Search failed");
    assert_eq!(search_nested.len(), 1, "Nested should match in sub_dir scope");

    // 6. Test Single Directory Incremental Sync
    let added_file = sub_dir.join("added.md");
    fs::write(&added_file, "# Newly added\nSome content").unwrap();
    db::sync_directory(&mut conn, sub_dir.to_str().unwrap()).expect("Sync directory failed");
    let sub_tree_after_add = db::read_workspace_tree_db(&conn, sub_dir.to_str().unwrap(), "name-asc").unwrap();
    assert_eq!(sub_tree_after_add.len(), 2, "Expected 2 entries after sync_directory");

    fs::remove_file(&added_file).unwrap();
    db::sync_directory(&mut conn, sub_dir.to_str().unwrap()).expect("Sync directory failed");
    let sub_tree_after_remove = db::read_workspace_tree_db(&conn, sub_dir.to_str().unwrap(), "name-asc").unwrap();
    assert_eq!(sub_tree_after_remove.len(), 1, "Expected 1 entry after removing and sync_directory");

    // Verify .gitignore in .zentauri
    assert!(temp_dir.join(".zentauri").join(".gitignore").exists(), ".zentauri/.gitignore must be auto-generated");

    // Test that LIKE wildcard '_' is escaped and does not match arbitrary characters
    let search_wildcard = db::search_files_db(&conn, "Pan_ni", temp_dir.to_str().unwrap()).expect("Search failed");
    assert_eq!(search_wildcard.len(), 0, "Pan_ni should not match panini.md when _ is escaped");

    println!("✓ SQLite Recursive Indexing & Metadata: PASS (Root: 4 items, Subfolder: 1 item, Badges ready)");
    println!("✓ Knowledge Graph Data: PASS (Nodes: {}, Edges: {})", graph.nodes.len(), graph.edges.len());
    println!("✓ Scoped Search & sync_directory: PASS");

    // Clean up
    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_typst_native_pdf_export() {
    let output_pdf = std::env::temp_dir().join("zentauri_scholarly_demo.pdf");
    let _ = fs::remove_file(&output_pdf);

    let typst_markup = r##"
#set page(paper: "a4", margin: (x: 2cm, y: 2.5cm))
#set text(font: ("Liberation Serif", "Linux Libertine", "Noto Sans Devanagari"), size: 11pt)
#set par(justify: true)

= Zentauri Native Typst PDF Demonstration

== 1. Scholarly Grammar Box
#rect(width: 100%, inset: 10pt, stroke: 1pt + rgb("#d8d2c6"), fill: rgb("#f1eee7"), radius: 4pt)[
  *Schema: Prädikatsnomen - Subjekt* \
  z.B. devo viṣṇuḥ = #text(font: "Noto Sans Devanagari")[देवो विष्णुः] = "Viṣṇu ist ein Gott."
]

== 2. Mathematical Equations
$ e^(i pi) + 1 = 0 $

$ sum_(k=1)^n k = (n(n+1)) / 2 $

$ 100 "USD" $

$ "Total"_("USD") = 100 $

== 3. Tabular Overview
#table(
  columns: (auto, auto, 1fr),
  stroke: 0.5pt + rgb("#d8d2c6"),
  inset: 6pt,
  [*Lautklasse*], [*IAST*], [*Devanāgarī*],
  [Gutturale], [k, kh, g, gh, ṅ], [#text(font: "Noto Sans Devanagari")[क, ख, ग, घ, ङ]],
  [Palatale], [c, ch, j, jh, ñ], [#text(font: "Noto Sans Devanagari")[च, छ, ज, झ, ञ]],
)
"##;

    // Compile via Typst Engine with system and embedded fonts
    let engine = TypstEngine::builder()
        .search_fonts_with(typst_as_lib::typst_kit_options::TypstKitFontOptions::default())
        .main_file(typst_markup.to_string())
        .build();

    let doc = engine.compile().output.expect("Typst compilation failed");
    let options = typst_pdf::PdfOptions::default();
    let pdf_bytes = typst_pdf::pdf(&doc, &options).expect("PDF generation failed");

    fs::write(&output_pdf, &pdf_bytes).expect("Failed to write PDF file");

    assert!(output_pdf.exists(), "PDF file must exist");
    assert!(pdf_bytes.len() > 1000, "PDF must have content");
    println!("✓ Typst Native PDF Rendering: PASS ({:?}, Size: {} bytes)", output_pdf, pdf_bytes.len());

    // Test Hayro pure-Rust PDF to SVG rendering
    let pdf = hayro_syntax::Pdf::new(pdf_bytes).expect("Hayro failed to parse PDF");
    let pages = pdf.pages();
    assert_eq!(pages.len(), 1, "Expected 1 page in demo PDF");
    let page = pages.get(0).expect("Page 0 must exist");
    let cache = hayro_svg::RenderCache::new();
    let interpreter_settings = hayro_interpret::InterpreterSettings::default();
    let settings = hayro_svg::SvgRenderSettings::default();
    let svg_str = hayro_svg::convert(&page, &cache, &interpreter_settings, &settings);
    assert!(svg_str.contains("<svg"), "Output must contain <svg root element");
    println!("✓ SVG Preview: {}", &svg_str[..svg_str.len().min(250)]);
    println!("✓ Hayro Pure-Rust PDF to SVG: PASS (SVG size: {} bytes)", svg_str.len());

    // Test Tauri IPC handlers get_pdf_info and render_pdf_page_svg
    tauri::async_runtime::block_on(async {
        let info = tauri_app_lib::get_pdf_info_impl(output_pdf.to_str().unwrap().to_string())
            .await
            .expect("get_pdf_info failed");
        assert_eq!(info.page_count, 1);
        assert_eq!(info.file_name, "zentauri_scholarly_demo.pdf");

        let svg = tauri_app_lib::render_pdf_page_svg_impl(output_pdf.to_str().unwrap().to_string(), 0)
            .await
            .expect("render_pdf_page_svg failed");
        assert!(svg.contains("<svg"));
        println!("✓ Tauri PDF IPC Handlers: PASS (Page count: {}, SVG size: {} bytes)", info.page_count, svg.len());
    });
}

#[test]
fn test_export_pdf_validation_rules() {
    use tauri_app_lib::validate_export_destination;

    // 1. Rejects null bytes
    assert!(validate_export_destination("/valid/path\0evil.pdf").is_err());

    // 2. Rejects non-pdf extensions
    assert!(validate_export_destination("/valid/path/file.txt").is_err());
    assert!(validate_export_destination("/valid/path/file.exe").is_err());
    assert!(validate_export_destination("/valid/path/file.sh").is_err());

    // 3. Rejects system root paths
    assert!(validate_export_destination("/evil.pdf").is_err());
    assert!(validate_export_destination("/etc/evil.pdf").is_err());
    assert!(validate_export_destination("/system/evil.pdf").is_err());
    assert!(validate_export_destination("/usr/evil.pdf").is_err());

    // 4. Rejects sensitive configuration components
    assert!(validate_export_destination("/home/user/.ssh/id_rsa.pdf").is_err());
    assert!(validate_export_destination("/Users/user/.gnupg/keys.pdf").is_err());
    assert!(validate_export_destination("/Users/user/.bashrc.pdf").is_err());

    // 5. Accepts valid path in temp directory
    let temp_target = std::env::temp_dir().join("valid_export_test.pdf");
    let result = validate_export_destination(temp_target.to_str().unwrap());
    assert!(result.is_ok(), "Temp path must be allowed: {:?}", result);

    #[cfg(unix)]
    if std::path::Path::new("/tmp").is_dir() {
        let tmp_direct = validate_export_destination("/tmp/linux_valid_export.pdf");
        assert!(tmp_direct.is_ok(), "/tmp direct export must be allowed on unix: {:?}", tmp_direct);
    }
}

#[test]
fn test_boethlingk_pdf_render() {
    let pdf_path = "/Volumes/SanDisk1TB/proj/boethlingk/data/output/boethlingk1887_facsimile_dense_test.pdf";
    if !std::path::Path::new(pdf_path).exists() {
        println!("Skipping, test file not found");
        return;
    }
    use tauri_app_lib::scope_svg_ids;
    let data = std::fs::read(pdf_path).unwrap();
    let pdf = hayro_syntax::Pdf::new(data).unwrap();
    let page0 = pdf.pages().get(0).unwrap();
    let cache = hayro_svg::RenderCache::new();
    let interpreter_settings = hayro_interpret::InterpreterSettings::default();
    let settings = hayro_svg::SvgRenderSettings::default();
    
    let raw_svg0 = hayro_svg::convert(&page0, &cache, &interpreter_settings, &settings);
    let scoped_svg0 = scope_svg_ids(&raw_svg0, pdf_path, 0);
    
    let page1 = pdf.pages().get(1).unwrap();
    let raw_svg1 = hayro_svg::convert(&page1, &cache, &interpreter_settings, &settings);
    let scoped_svg1 = scope_svg_ids(&raw_svg1, pdf_path, 1);

    // Verify ID scoping: no raw un-scoped IDs remain
    assert!(!scoped_svg0.contains("id=\"g0\""), "Page 0 must not contain un-scoped id=g0");
    assert!(!scoped_svg1.contains("id=\"g0\""), "Page 1 must not contain un-scoped id=g0");
    assert!(!scoped_svg0.contains("href=\"#g0\""), "Page 0 must not contain un-scoped href=#g0");
    assert!(!scoped_svg1.contains("href=\"#g0\""), "Page 1 must not contain un-scoped href=#g0");

    // Scoped IDs must have page-specific prefixes
    assert!(scoped_svg0.contains("id=\"p0_"), "Page 0 must have p0_ prefix");
    assert!(scoped_svg1.contains("id=\"p1_"), "Page 1 must have p1_ prefix");

    // Extract all IDs from both pages and ensure completely disjoint sets
    let extract_ids = |svg: &str| -> std::collections::HashSet<String> {
        let mut set = std::collections::HashSet::new();
        for part in svg.split("id=\"").skip(1) {
            if let Some(end) = part.find('"') {
                set.insert(part[..end].to_string());
            }
        }
        set
    };

    let ids0 = extract_ids(&scoped_svg0);
    let ids1 = extract_ids(&scoped_svg1);
    assert!(!ids0.is_empty(), "Page 0 must have IDs");
    assert!(!ids1.is_empty(), "Page 1 must have IDs");
    assert!(
        ids0.is_disjoint(&ids1),
        "Page 0 IDs and Page 1 IDs must be completely disjoint to prevent SVG pollution!"
    );
    println!("✓ PDF Multi-Page SVG ID Isolation: PASS (Page 0 IDs: {}, Page 1 IDs: {}, Disjoint: true)", ids0.len(), ids1.len());
}

#[test]
fn test_vidyut_transliteration() {
    use vidyut_lipi::{Lipika, Scheme};
    let mut lipika = Lipika::new();

    // 1. IAST -> Devanagari
    assert_eq!(lipika.transliterate("dharmaḥ", Scheme::Iast, Scheme::Devanagari), "धर्मः");
    assert_eq!(lipika.transliterate("kṛṣṇaḥ", Scheme::Iast, Scheme::Devanagari), "कृष्णः");
    assert_eq!(lipika.transliterate("saṃskṛtam", Scheme::Iast, Scheme::Devanagari), "संस्कृतम्");
    assert_eq!(lipika.transliterate("śāntiḥ", Scheme::Iast, Scheme::Devanagari), "शान्तिः");
    assert_eq!(lipika.transliterate("vidyā", Scheme::Iast, Scheme::Devanagari), "विद्या");

    // 2. Devanagari -> IAST
    assert_eq!(lipika.transliterate("धर्मः", Scheme::Devanagari, Scheme::Iast), "dharmaḥ");
    assert_eq!(lipika.transliterate("कृष्णः", Scheme::Devanagari, Scheme::Iast), "kṛṣṇaḥ");
    assert_eq!(lipika.transliterate("संस्कृतम्", Scheme::Devanagari, Scheme::Iast), "saṃskṛtam");
    assert_eq!(lipika.transliterate("शान्तिः", Scheme::Devanagari, Scheme::Iast), "śāntiḥ");

    // 3. Harvard-Kyoto -> Devanagari
    assert_eq!(lipika.transliterate("dharmaH", Scheme::HarvardKyoto, Scheme::Devanagari), "धर्मः");
    assert_eq!(lipika.transliterate("kRSNaH", Scheme::HarvardKyoto, Scheme::Devanagari), "कृष्णः");
    assert_eq!(lipika.transliterate("saMskRtam", Scheme::HarvardKyoto, Scheme::Devanagari), "संस्कृतम्");
    assert_eq!(lipika.transliterate("zAntiH", Scheme::HarvardKyoto, Scheme::Devanagari), "शान्तिः");
    assert_eq!(lipika.transliterate("dharmakSetre", Scheme::HarvardKyoto, Scheme::Devanagari), "धर्मक्षेत्रे");

    // 5. Brackets
    assert_eq!(lipika.transliterate("《dharma》", Scheme::Iast, Scheme::Devanagari), "《धर्म》");
    assert_eq!(lipika.transliterate("《धर्म》", Scheme::Devanagari, Scheme::Iast), "《dharma》");
    assert_eq!(lipika.transliterate("⟪kṛṣṇa⟫", Scheme::Iast, Scheme::Devanagari), "⟪कृष्ण⟫");
    assert_eq!(lipika.transliterate("⟪कृष्ण⟫", Scheme::Devanagari, Scheme::Iast), "⟪kṛṣṇa⟫");

    // 6. Directives and IPC Impl helpers
    use tauri_app_lib::{transliterate_sanskrit_impl, toggle_transliteration_impl};
    assert_eq!(transliterate_sanskrit_impl(":sig[kṛṣṇaḥ]", "iast", "devanagari"), ":sig[कृष्णः]");
    assert_eq!(transliterate_sanskrit_impl(":sig[कृष्णः]", "devanagari", "iast"), ":sig[kṛṣṇaḥ]");
    assert_eq!(transliterate_sanskrit_impl("dharmaḥ :sig[kṛṣṇaḥ] śāntiḥ", "iast", "devanagari"), "धर्मः :sig[कृष्णः] शान्तिः");
    assert_eq!(toggle_transliteration_impl("dharmaḥ", "iast"), "धर्मः");
    assert_eq!(toggle_transliteration_impl("धर्मः", "iast"), "dharmaḥ");
    assert_eq!(toggle_transliteration_impl("dharmakSetre", "hk"), "धर्मक्षेत्रे");
    assert_eq!(toggle_transliteration_impl("धर्मक्षेत्रे", "hk"), "dharmakSetre");
}
