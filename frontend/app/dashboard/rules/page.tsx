"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { Play, Save, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";

export default function RulesEnginePage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const [templates, setTemplates] = useState<any[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<any | null>(null);
  const [yamlContent, setYamlContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testUrl, setTestUrl] = useState("http://localhost:8080");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/templates`);
      const data = await res.json();
      setTemplates(data);
      if (data.length > 0 && !activeTemplate) {
        selectTemplate(data[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch templates", err);
      setLoading(false);
    }
  };

  const selectTemplate = (t: any) => {
    setActiveTemplate(t);
    setYamlContent(t.yamlContent);
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!activeTemplate) return;
    setSaving(true);
    try {
      const isNew = !activeTemplate.id;
      const url = isNew 
        ? `${API_BASE_URL}/api/templates` 
        : `${API_BASE_URL}/api/templates/${activeTemplate.id}`;
      
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: activeTemplate.name || "New Template",
          severity: activeTemplate.severity || "MEDIUM",
          target: activeTemplate.target || "URL",
          yamlContent,
          enabled: true
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert("Failed to save: " + (err.error || err.details || res.statusText));
      } else {
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!activeTemplate || !activeTemplate.id) return;
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/templates/${activeTemplate.id}`, {
        method: "DELETE"
      });
      setActiveTemplate(null);
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNew = () => {
    const newTemplate = {
      name: "New Custom Rule",
      severity: "MEDIUM",
      target: "URL",
      yamlContent: \`id: new-rule
info:
  name: New Custom Rule
  author: SECORA
  description: Description of the vulnerability
payloads:
  - "payload1"
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "success"\`
    };
    setTemplates([newTemplate, ...templates]);
    selectTemplate(newTemplate);
  };

  const handleTest = async () => {
    if (!activeTemplate || !testUrl) return;
    setTesting(true);
    setTestResult(null);
    try {
      // We will create a test route in the backend
      const res = await fetch(`${API_BASE_URL}/api/templates/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: testUrl,
          yamlContent: yamlContent
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ error: "Network error or invalid URL" });
    }
    setTesting(false);
  };

  if (loading) return <div className="p-8 text-white">Loading Rules Engine...</div>;

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white pt-16">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-[#1a1a1a] flex flex-col bg-[#0f0f0f]">
        <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center bg-gradient-to-r from-indigo-900/20 to-transparent">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <span className="text-indigo-400">📜</span> Custom Rules
          </h2>
          <button 
            onClick={handleCreateNew}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors text-sm font-medium flex items-center gap-1"
          >
            <Plus size={16} /> New
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {templates.map((t, idx) => (
            <button
              key={t.id || idx}
              onClick={() => selectTemplate(t)}
              className={\`w-full text-left p-3 rounded-lg text-sm transition-all \${
                activeTemplate?.id === t.id 
                  ? 'bg-indigo-900/30 border border-indigo-500/50 text-indigo-300' 
                  : 'hover:bg-[#1a1a1a] border border-transparent text-gray-400'
              }\`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-gray-200 truncate pr-2">{t.name}</span>
                <span className={\`text-xs px-2 py-0.5 rounded-full border \${
                  t.severity === 'CRITICAL' ? 'bg-red-900/30 border-red-500/50 text-red-400' :
                  t.severity === 'HIGH' ? 'bg-orange-900/30 border-orange-500/50 text-orange-400' :
                  t.severity === 'MEDIUM' ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400' :
                  'bg-blue-900/30 border-blue-500/50 text-blue-400'
                }\`}>
                  {t.severity}
                </span>
              </div>
              <div className="text-xs text-gray-500 truncate">{t.id ? 'Saved' : 'Draft'} • Target: {t.target}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Main */}
      <div className="w-2/3 flex flex-col bg-[#050505]">
        {activeTemplate ? (
          <>
            <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center bg-[#0a0a0a]">
              <div>
                <h3 className="font-medium text-gray-200">{activeTemplate.name}</h3>
                <p className="text-xs text-gray-500">Edit your custom YAML signature</p>
              </div>
              <div className="flex gap-2">
                {activeTemplate.id && (
                  <button onClick={handleDelete} className="p-2 border border-[#333] hover:bg-red-900/30 hover:border-red-500/50 hover:text-red-400 rounded-md transition-colors text-gray-400">
                    <Trash2 size={16} />
                  </button>
                )}
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-md transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Save size={16} /> {saving ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>

            {/* Test Bar */}
            <div className="p-3 bg-[#0a0a0a] border-b border-[#1a1a1a] flex gap-2 items-center">
              <input 
                type="text" 
                value={testUrl}
                onChange={e => setTestUrl(e.target.value)}
                placeholder="Enter URL to test this template (e.g., http://localhost:8080)"
                className="flex-1 bg-[#151515] border border-[#333] rounded p-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-gray-200"
              />
              <button 
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 border border-[#333] hover:border-green-500/50 hover:bg-green-900/20 disabled:opacity-50 rounded-md transition-colors text-sm font-medium flex items-center gap-2 text-green-400"
              >
                <Play size={16} /> {testing ? "Testing..." : "Test Target"}
              </button>
            </div>

            {/* Test Result Display */}
            {testResult && (
              <div className={\`p-4 border-b border-[#1a1a1a] \${testResult.findings?.length > 0 ? 'bg-red-900/10' : 'bg-green-900/10'}\`}>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  {testResult.findings?.length > 0 ? <XCircle size={16} className="text-red-400"/> : <CheckCircle2 size={16} className="text-green-400"/>}
                  Test Results
                </h4>
                {testResult.error ? (
                  <p className="text-sm text-red-400">{testResult.error}</p>
                ) : testResult.findings?.length > 0 ? (
                  <div className="space-y-2">
                    {testResult.findings.map((f: any, i: number) => (
                      <div key={i} className="p-3 bg-[#111] border border-red-500/30 rounded text-sm">
                        <strong className="text-red-400">[{f.severity}] VULNERABILITY FOUND</strong><br/>
                        <span className="text-gray-300">{f.name}</span><br/>
                        <span className="text-xs text-gray-500">Payload: {f.payload}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-400">Target is secure against this rule. No findings triggered.</p>
                )}
              </div>
            )}

            <div className="flex-1 relative">
              <Editor
                height="100%"
                defaultLanguage="yaml"
                theme="vs-dark"
                value={yamlContent}
                onChange={(val) => setYamlContent(val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: "on",
                  padding: { top: 16 }
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a template from the sidebar or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}
