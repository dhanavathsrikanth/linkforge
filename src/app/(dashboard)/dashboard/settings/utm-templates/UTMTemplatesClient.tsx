"use client";

import { useState } from "react";
import { Plus, Tag } from "lucide-react";

type UTMTemplate = {
  id: string;
  name: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  isDefault: boolean;
};

export function UTMTemplatesClient({ workspaceId, initialTemplates }: { workspaceId: string, initialTemplates: UTMTemplate[] }) {
  const [templates, setTemplates] = useState<UTMTemplate[]>(initialTemplates);

  return (
    <div className="space-y-6 max-w-4xl py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">UTM Templates</h1>
          <p className="text-slate-500 mt-1">Pre-configure UTM parameters to quickly apply them when creating short links.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#433BFF] text-white rounded-lg hover:bg-[#3730E6] transition-colors font-medium text-sm shadow-sm">
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      <div className="grid gap-4 mt-8">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-200 rounded-xl bg-slate-50">
            <div className="h-12 w-12 bg-white rounded-full border border-slate-200 flex items-center justify-center mb-4 shadow-sm">
              <Tag className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-950">No templates yet</h3>
            <p className="text-slate-500 text-center max-w-md mt-1 mb-6 text-sm">
              Create your first UTM template to save time and enforce consistency when generating links for your campaigns.
            </p>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm">
              <Plus className="h-4 w-4" />
              Create Template
            </button>
          </div>
        ) : (
          templates.map(t => (
            <div key={t.id} className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm flex justify-between items-center hover:border-slate-300 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-950">{t.name}</h3>
                  {t.isDefault && (
                    <span className="bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border border-blue-200">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 font-mono">
                  ?utm_source={t.source || 'N/A'}&utm_medium={t.medium || 'N/A'}&utm_campaign={t.campaign || 'N/A'}
                </p>
              </div>
              <button className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
                Edit
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
