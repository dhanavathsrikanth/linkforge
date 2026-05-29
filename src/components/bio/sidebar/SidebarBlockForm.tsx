"use client";

import { ArrowLeft } from "lucide-react";
import { useBioEdit } from "@/contexts/BioEditContext";
import { BIO_BLOCK_CATALOG } from "@/components/bio/blockCatalog";
import { BLOCK_FORM_REGISTRY } from "@/components/bio/forms/formRegistry";

interface SidebarBlockFormProps {
  /** Current config of the block being edited */
  blockConfig: Record<string, unknown>;
  /** Gallery ID — threaded into forms that need FileUpload */
  galleryId: string;
  onSave: (blockId: string, config: Record<string, unknown>) => void;
}

export function SidebarBlockForm({ blockConfig, galleryId, onSave }: SidebarBlockFormProps) {
  const { currentEditingBlock, setSidebarView, setCurrentEditingBlock } = useBioEdit();

  if (!currentEditingBlock) return null;

  const blockMeta = BIO_BLOCK_CATALOG.find((b) => b.type === currentEditingBlock.type);
  const FormComponent = BLOCK_FORM_REGISTRY[currentEditingBlock.type];

  function handleBack() {
    setCurrentEditingBlock(null);
    setSidebarView("blocks");
  }

  function handleSave(config: Record<string, unknown>) {
    if (!currentEditingBlock) return;
    onSave(currentEditingBlock.id, config);
    setCurrentEditingBlock(null);
    setSidebarView("blocks");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-200 shrink-0">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 mb-2 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to blocks
        </button>
        <h2 className="text-sm font-semibold text-stone-900">
          Edit {blockMeta?.title ?? currentEditingBlock.type}
        </h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {FormComponent ? (
          <FormComponent
            config={blockConfig}
            onSave={handleSave}
            onCancel={handleBack}
            galleryId={galleryId}
            blockId={currentEditingBlock.id}
          />
        ) : (
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center">
            <p className="text-xs text-stone-500">
              No edit form available for this block type.
            </p>
            <p className="text-xs text-stone-400 mt-1 font-mono">{currentEditingBlock.type}</p>
          </div>
        )}
      </div>
    </div>
  );
}
