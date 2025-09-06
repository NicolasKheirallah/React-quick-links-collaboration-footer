import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import { CategoryService, ILinkCategory, ICategoryStats } from '../services/categoryService';
import { Log } from '@microsoft/sp-core-library';

const LOG_SOURCE: string = 'useCategories';

export interface ICategoriesHook {
  categories: ILinkCategory[];
  activeCategories: ILinkCategory[];
  categoryOptions: Array<{key: string, text: string}>;
  categoryStats: ICategoryStats | null;
  isLoading: boolean;
  
  refreshCategories: () => Promise<void>;
  createCategory: (categoryData: Partial<ILinkCategory>) => Promise<ILinkCategory>;
  updateCategory: (categoryId: string, updates: Partial<ILinkCategory>) => Promise<ILinkCategory>;
  deleteCategory: (categoryId: string) => Promise<void>;
  reorderCategories: (categoryIds: string[]) => Promise<ILinkCategory[]>;
  exportCategories: () => Promise<string>;
  importCategories: (categoriesJson: string, replaceExisting?: boolean) => Promise<ILinkCategory[]>;
  resetToDefaults: () => Promise<ILinkCategory[]>;
  
  getCategoryById: (id: string) => ILinkCategory | undefined;
  getCategoryByName: (name: string) => ILinkCategory | undefined;
  getLinksForCategory: (categoryId: string) => IContextualMenuItem[];
  validateCategory: (category: Partial<ILinkCategory>) => string[];
}

export const useCategories = (
  context?: WebPartContext,
  links: IContextualMenuItem[] = []
): ICategoriesHook => {
  const [categories, setCategories] = useState<ILinkCategory[]>([]);
  const [categoryStats, setCategoryStats] = useState<ICategoryStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const linksRef = useRef(links);
  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  const refreshCategories = useCallback(async () => {
    if (!context) return;
    
    try {
      setIsLoading(true);
      
      const [categoriesData, statsData] = await Promise.all([
        CategoryService.getCategories(context),
        CategoryService.getCategoryStats(linksRef.current, context)
      ]);
      
      setCategories(categoriesData);
      setCategoryStats(statsData);
      
      Log.info(LOG_SOURCE, `Loaded ${categoriesData.length} categories`);
      
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      setCategories([]);
      setCategoryStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [context]);

  const createCategory = useCallback(async (categoryData: Partial<ILinkCategory>): Promise<ILinkCategory> => {
    if (!context) throw new Error('Context is required');
    
    try {
      const newCategory = await CategoryService.createCategory(categoryData, context);
      await refreshCategories();
      return newCategory;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      throw error;
    }
  }, [context, refreshCategories]);

  const updateCategory = useCallback(async (
    categoryId: string, 
    updates: Partial<ILinkCategory>
  ): Promise<ILinkCategory> => {
    if (!context) throw new Error('Context is required');
    
    try {
      const updatedCategory = await CategoryService.updateCategory(categoryId, updates, context);
      await refreshCategories();
      return updatedCategory;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      throw error;
    }
  }, [context, refreshCategories]);

  const deleteCategory = useCallback(async (categoryId: string): Promise<void> => {
    if (!context) throw new Error('Context is required');
    
    try {
      await CategoryService.deleteCategory(categoryId, context, links);
      await refreshCategories();
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      throw error;
    }
  }, [context, links, refreshCategories]);

  const reorderCategories = useCallback(async (categoryIds: string[]): Promise<ILinkCategory[]> => {
    if (!context) throw new Error('Context is required');
    
    try {
      const reorderedCategories = await CategoryService.reorderCategories(categoryIds, context);
      await refreshCategories();
      return reorderedCategories;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      throw error;
    }
  }, [context, refreshCategories]);

  const exportCategories = useCallback(async (): Promise<string> => {
    if (!context) throw new Error('Context is required');
    
    try {
      return await CategoryService.exportCategories(context);
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      throw error;
    }
  }, [context]);

  const importCategories = useCallback(async (
    categoriesJson: string, 
    replaceExisting = false
  ): Promise<ILinkCategory[]> => {
    if (!context) throw new Error('Context is required');
    
    try {
      const importedCategories = await CategoryService.importCategories(categoriesJson, context, replaceExisting);
      await refreshCategories();
      return importedCategories;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      throw error;
    }
  }, [context, refreshCategories]);

  const resetToDefaults = useCallback(async (): Promise<ILinkCategory[]> => {
    if (!context) throw new Error('Context is required');
    
    try {
      const defaultCategories = await CategoryService.resetToDefaults(context);
      await refreshCategories();
      return defaultCategories;
    } catch (error) {
      Log.error(LOG_SOURCE, error as Error);
      throw error;
    }
  }, [context, refreshCategories]);

  const validateCategory = useCallback((category: Partial<ILinkCategory>): string[] => {
    return CategoryService.validateCategory(category);
  }, []);

  const getCategoryById = useCallback((id: string): ILinkCategory | undefined => {
    return categories.find(cat => cat.id === id);
  }, [categories]);

  const getCategoryByName = useCallback((name: string): ILinkCategory | undefined => {
    return categories.find(cat => cat.name.toLowerCase() === name.toLowerCase());
  }, [categories]);

  const getLinksForCategory = useCallback((categoryId: string): IContextualMenuItem[] => {
    return links.filter(link => {
      const linkData = link as any;
      return linkData.category === categoryId || linkData.category === getCategoryById(categoryId)?.name;
    });
  }, [links, getCategoryById]);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshCategories();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [links.length, refreshCategories]);

  const activeCategories = useMemo(() => 
    categories.filter(cat => cat.isActive), 
    [categories]
  );

  const categoryOptions = useMemo(() => 
    activeCategories.map(cat => ({
      key: cat.id,
      text: cat.name
    })), 
    [activeCategories]
  );

  const hookValue = useMemo((): ICategoriesHook => ({
    categories,
    activeCategories,
    categoryOptions,
    categoryStats,
    isLoading,
    
    refreshCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    exportCategories,
    importCategories,
    resetToDefaults,
    
    getCategoryById,
    getCategoryByName,
    getLinksForCategory,
    validateCategory
  }), [
    categories,
    activeCategories,
    categoryOptions,
    categoryStats,
    isLoading,
    refreshCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    exportCategories,
    importCategories,
    resetToDefaults,
    getCategoryById,
    getCategoryByName,
    getLinksForCategory,
    validateCategory
  ]);

  return hookValue;
};