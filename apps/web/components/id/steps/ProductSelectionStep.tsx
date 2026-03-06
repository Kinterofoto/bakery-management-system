"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Sparkles, FileText, Target, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Prototype } from "@/hooks/use-prototypes";

interface Product {
  id: string;
  name: string;
  category: string;
}

interface ProductSelectionStepProps {
  initialData: Partial<Prototype> | null;
  generatedCode: string | null;
  onSave: (data: {
    product_id: string | null;
    product_name: string;
    product_category: string;
    is_new_product: boolean;
    code: string;
    description: string;
    objectives: string;
  }) => void;
  onCodeGenerate: () => Promise<string | null>;
}

export function ProductSelectionStep({
  initialData,
  generatedCode,
  onSave,
  onCodeGenerate,
}: ProductSelectionStepProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Form state
  const [isNewProduct, setIsNewProduct] = useState(
    initialData?.is_new_product ?? false
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productName, setProductName] = useState(
    initialData?.product_name ?? ""
  );
  const [productCategory, setProductCategory] = useState(
    initialData?.product_category ?? "PT"
  );
  const [code, setCode] = useState(initialData?.code ?? generatedCode ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [objectives, setObjectives] = useState(initialData?.objectives ?? "");

  // Fetch products for the combobox
  useEffect(() => {
    async function fetchProducts() {
      setProductsLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, name, category")
        .in("category", ["PT", "PP"])
        .order("name");
      setProducts((data as Product[]) || []);
      setProductsLoading(false);
    }
    fetchProducts();
  }, []);

  // Auto-generate code on mount if missing
  useEffect(() => {
    if (!code && !initialData?.code) {
      onCodeGenerate().then((c) => {
        if (c) setCode(c);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync generatedCode prop
  useEffect(() => {
    if (generatedCode && !code) {
      setCode(generatedCode);
    }
  }, [generatedCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProductSelect = useCallback((product: Product) => {
    setSelectedProduct(product);
    setProductName(product.name);
    setProductCategory(product.category);
    setSearchOpen(false);
  }, []);

  const handleToggleNew = useCallback(
    (checked: boolean) => {
      setIsNewProduct(checked);
      if (checked) {
        setSelectedProduct(null);
        setProductName("");
        setProductCategory("PT");
      }
    },
    []
  );

  // Expose save handler to parent
  const handleSave = useCallback(() => {
    onSave({
      product_id: isNewProduct ? null : selectedProduct?.id ?? initialData?.product_id ?? null,
      product_name: productName,
      product_category: productCategory,
      is_new_product: isNewProduct,
      code,
      description,
      objectives,
    });
  }, [
    isNewProduct,
    selectedProduct,
    initialData,
    productName,
    productCategory,
    code,
    description,
    objectives,
    onSave,
  ]);

  // Auto-trigger save when navigating (parent calls onSave via ref or callback)
  useEffect(() => {
    // Expose the save handler on component for the wizard to call
    (window as any).__wizardStepSave = handleSave;
    return () => {
      delete (window as any).__wizardStepSave;
    };
  }, [handleSave]);

  const isValid = productName.trim().length > 0 && code.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-6 pb-32 md:pb-8"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Seleccion de Producto
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Selecciona un producto existente o define uno nuevo para prototipar.
        </p>
      </div>

      {/* New product toggle */}
      <div
        className={cn(
          "flex items-center justify-between",
          "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "rounded-2xl p-4 shadow-sm"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-lime-500/10">
            <Plus className="w-5 h-5 text-lime-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Producto nuevo
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Crear un producto que no existe en el catalogo
            </p>
          </div>
        </div>
        <Switch
          checked={isNewProduct}
          onCheckedChange={handleToggleNew}
          aria-label="Producto nuevo"
        />
      </div>

      {/* Product selection / creation */}
      {!isNewProduct ? (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Buscar producto existente
          </Label>
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={searchOpen}
                className={cn(
                  "w-full justify-between h-14 rounded-xl text-left",
                  "bg-white/50 dark:bg-black/30 backdrop-blur-md",
                  "border border-gray-200/50 dark:border-white/10",
                  "hover:bg-white/70 dark:hover:bg-black/40",
                  !productName && "text-gray-400"
                )}
              >
                <span className="truncate">
                  {productName || "Seleccionar producto..."}
                </span>
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar producto..." />
                <CommandList>
                  <CommandEmpty>
                    {productsLoading
                      ? "Cargando..."
                      : "No se encontraron productos."}
                  </CommandEmpty>
                  <CommandGroup>
                    {products.map((product) => (
                      <CommandItem
                        key={product.id}
                        value={product.name}
                        onSelect={() => handleProductSelect(product)}
                        className="py-3"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {product.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {product.category === "PT"
                              ? "Producto Terminado"
                              : "Producto en Proceso"}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="product-name"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Nombre del producto
            </Label>
            <Input
              id="product-name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ej: Pan de Chocolate Premium"
              className={cn(
                "h-14 rounded-xl text-base",
                "bg-white/50 dark:bg-black/30 backdrop-blur-md",
                "border border-gray-200/50 dark:border-white/10",
                "focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500/50"
              )}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Categoria
            </Label>
            <div className="flex gap-3">
              {[
                { value: "PT", label: "Producto Terminado" },
                { value: "PP", label: "Producto en Proceso" },
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setProductCategory(cat.value)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-xl text-sm font-medium",
                    "border transition-all duration-150",
                    "active:scale-95",
                    productCategory === cat.value
                      ? "bg-lime-500/15 border-lime-500/30 text-lime-700 dark:text-lime-400"
                      : "bg-white/50 dark:bg-black/30 border-gray-200/50 dark:border-white/10 text-gray-600 dark:text-gray-400"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Auto-generated code */}
      <div
        className={cn(
          "bg-white/70 dark:bg-black/50 backdrop-blur-xl",
          "border border-white/20 dark:border-white/10",
          "rounded-2xl p-4 shadow-sm"
        )}
      >
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-4 h-4 text-lime-500" />
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Codigo de prototipo
          </Label>
        </div>
        <Input
          value={code}
          readOnly
          className={cn(
            "h-12 rounded-xl text-base font-mono tracking-wider",
            "bg-gray-50/50 dark:bg-white/5",
            "border border-gray-200/30 dark:border-white/5",
            "text-gray-900 dark:text-white cursor-default"
          )}
          aria-label="Codigo de prototipo generado"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <Label
            htmlFor="description"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Descripcion
          </Label>
        </div>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe brevemente el prototipo..."
          rows={3}
          className={cn(
            "rounded-xl text-base resize-none",
            "bg-white/50 dark:bg-black/30 backdrop-blur-md",
            "border border-gray-200/50 dark:border-white/10",
            "focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500/50"
          )}
        />
      </div>

      {/* Objectives */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-400" />
          <Label
            htmlFor="objectives"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Objetivos
          </Label>
        </div>
        <Textarea
          id="objectives"
          value={objectives}
          onChange={(e) => setObjectives(e.target.value)}
          placeholder="Que se busca lograr con este prototipo..."
          rows={3}
          className={cn(
            "rounded-xl text-base resize-none",
            "bg-white/50 dark:bg-black/30 backdrop-blur-md",
            "border border-gray-200/50 dark:border-white/10",
            "focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500/50"
          )}
        />
      </div>
    </motion.div>
  );
}
