'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStoryStore } from '@/store/useStoryStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getTimelineGraphs, updateTimeline, deleteTimeline, Timeline } from '@/lib/timeline-api';
import { Save, AlertTriangle, Check, Loader2, ArrowRight, Book, ChevronDown, ChevronRight, Trash2, Plus, GitFork, CornerDownRight, SkipForward, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function TimelineTab() {
    const qc = useQueryClient();
    const storyId = useStoryStore(state => state.selectedStoryId);
    const [wizardOpen, setWizardOpen] = useState(false);

    const { data: timelines = [], isLoading } = useQuery({
        queryKey: ['tl', 'graphs', storyId],
        queryFn: () => storyId ? getTimelineGraphs(storyId) : Promise.resolve([]),
        enabled: !!storyId,
    });

    // Fetch story for default name
    const { data: story } = useQuery({
        queryKey: ['story', storyId],
        queryFn: async () => {
            if (!storyId) return null;
            const res = await fetch(`/api/stories/${storyId}`);
            if (!res.ok) throw new Error('Failed to fetch story');
            return res.json();
        },
        enabled: !!storyId,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12">
            <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-border shadow-sm">
                <div>
                    <h2 className="text-lg font-semibold text-text-primary">Timelines</h2>
                    <p className="text-sm text-text-secondary mt-1">Manage multiple timelines and define their structural hierarchy.</p>
                </div>
                <Button onClick={() => setWizardOpen(true)} size="sm" className="bg-accent hover:bg-accent-hover text-white shadow-md">
                    <GitFork className="mr-2 h-4 w-4" />
                    Create New Timeline
                </Button>
            </div>

            {timelines.length === 0 ? (
                <div className="text-sm text-center p-8 bg-surface/50 rounded-xl border border-dashed border-border text-text-muted">
                    No timelines found. Create your first timeline to organize your story.
                </div>
            ) : (
                <div className="space-y-4">
                    {timelines.map(tl => (
                        <TimelineEditor key={tl.id} timeline={tl} />
                    ))}
                </div>
            )}

            {wizardOpen && <CreateTimelineWizard isOpen={wizardOpen} onOpenChange={setWizardOpen} storyId={storyId!} defaultTimelineName={story?.title} />}
        </div>
    );
}

function CreateTimelineWizard({ isOpen, onOpenChange, storyId, defaultTimelineName }: { isOpen: boolean, onOpenChange: (open: boolean) => void, storyId: string, defaultTimelineName?: string }) {
    const qc = useQueryClient();
    const [step, setStep] = useState(0);

    const [config, setConfig] = useState({
        name: '',
        branch1Name: '',
        branch2Name: '',
        branch2Persist: false,
        branch3Name: '',
        branch3Persist: false,
        leafName: '',
        leafPersist: false,
    });

    useEffect(() => {
        if (isOpen) {
            setStep(0);
            setConfig({
                name: defaultTimelineName || 'Story Timeline',
                branch1Name: '',
                branch2Name: '',
                branch2Persist: false,
                branch3Name: '',
                branch3Persist: false,
                leafName: '',
                leafPersist: false,
            });
        }
    }, [isOpen, defaultTimelineName]);

    const handleInputChange = (field: string, value: string | boolean) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const createMut = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyId,
                    title: config.name,
                }),
            });
            if (!res.ok) throw new Error('Failed to create basic timeline');
            const data = await res.json();

            // Update with structure
            await updateTimeline(data.id, {
                name: config.name,
                branch1Name: config.branch1Name || 'Volume',
                branch2Name: config.branch2Name || null,
                branch3Name: config.branch3Name || null,
                leafName: config.leafName || 'Chapter',
                branch2Persist: config.branch2Persist,
                branch3Persist: config.branch3Persist,
                leafPersist: config.leafPersist,
            });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tl', 'graphs'] });
            toast.success("Timeline created");
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Error creating timeline');
        }
    });

    const isNextDisabled = () => {
        if (step === 0 && !config.name.trim()) return true;
        if (step === 1 && !config.branch1Name.trim()) return true;
        if (step === 4 && !config.leafName.trim()) return true;
        return false;
    };

    const onNext = () => {
        if (step < 4) setStep(s => s + 1);
        else createMut.mutate();
    };

    const renderPreview = () => {
        const path = [
            config.name || ' Timeline Name ',
            config.branch1Name || ' Branch ',
            config.branch2Name,
            config.branch3Name,
            config.leafName || ' Leaf '
        ].filter(Boolean);

        return (
            <div className="flex items-center text-sm font-medium text-text-primary bg-background/50 p-3 rounded-lg border border-border mt-2">
                <CornerDownRight className="h-4 w-4 text-accent mr-2 shrink-0" />
                <div className="flex flex-wrap items-center gap-2">
                    {path.map((item, i) => (
                        <span key={i} className="flex items-center">
                            <span className={!item.trim() ? "text-text-muted italic" : ""}>{item}</span>
                            {i < path.length - 1 && <span className="text-text-muted mx-2">{'>'}</span>}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    const svgStates = {
        start: { rect1: 16, rect2: 6, line: 2 },
        center: { rect1: 16, rect2: 2, line: 12 },
        end: { rect1: 12, rect2: 2, line: 22 }
    };

    const currentSvgState = step === 1 ? svgStates.start : step === 2 ? svgStates.center : step === 3 ? svgStates.end : step === 0 ? svgStates.start : svgStates.end;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">Create New Timeline</DialogTitle>
                    {renderPreview()}
                </DialogHeader>

                <div className="flex flex-col md:flex-row gap-6 mt-4 min-h-[300px]">
                    {/* Visual Panel */}
                    <div className="md:w-1/3 flex flex-col items-center justify-center bg-surface rounded-xl border border-border p-6 shadow-sm">
                        {step === 0 ? (
                            <Book className="h-24 w-24 text-accent opacity-80" strokeWidth={1.5} />
                        ) : step === 4 ? (
                            <div className="flex flex-col items-center gap-4">
                                <StickyNote className="h-16 w-16 text-text-primary opacity-60" strokeWidth={1.5} />
                                <div className="text-sm font-medium text-text-secondary text-center">Leaf Nodes</div>
                            </div>
                        ) : (
                            <div className="w-full max-w-[120px] aspect-square flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="14" height="6" x="5" y={currentSvgState.rect1} rx="2" stroke="currentColor" className="text-text-primary transition-all duration-500 ease-in-out" />
                                    <rect width="10" height="6" x="7" y={currentSvgState.rect2} rx="2" stroke="currentColor" className="text-text-primary transition-all duration-500 ease-in-out" />
                                    <path d={`M2 ${currentSvgState.line}h20`} stroke="currentColor" className="text-accent transition-all duration-500 ease-in-out" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Content Panel */}
                    <div className="md:w-2/3 flex flex-col justify-center space-y-4">
                        {step === 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                <div>
                                    <h3 className="text-lg font-semibold text-text-primary">Timeline Name</h3>
                                    <p className="text-sm text-text-secondary mt-1">What is the overarching name for this timeline? This usually represents the entire story or a large multi-threaded universe.</p>
                                </div>
                                <Input
                                    value={config.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    placeholder="e.g. My Epic Story"
                                    className="bg-surface text-lg py-6 focus-within:ring-accent"
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter' && !isNextDisabled()) onNext(); }}
                                />
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                <div>
                                    <h3 className="text-lg font-semibold text-text-primary">Branch 1 (Top Level)</h3>
                                    <p className="text-sm text-text-secondary mt-1">What is the highest level of organization in your story?</p>
                                    <p className="text-xs text-text-muted mt-2 p-2 bg-surface rounded border border-border">
                                        Examples: <br />
                                        <strong>Volume</strong> &gt; Section &gt; Part<br />
                                        <strong>Saga</strong> &gt; Arc<br />
                                        <strong>Play</strong> &gt; Act<br />
                                        <strong>Series</strong> &gt; Season &gt; Episode<br />
                                        <strong>Series</strong> &gt; Issue<br />
                                        <strong>Book</strong> &gt; Act<br />
                                        <strong>Album</strong> &gt; Track
                                    </p>
                                </div>
                                <Input
                                    value={config.branch1Name}
                                    onChange={(e) => handleInputChange('branch1Name', e.target.value)}
                                    placeholder="e.g. Volume"
                                    className="bg-surface text-lg py-6 focus-within:ring-accent"
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter' && !isNextDisabled()) onNext(); }}
                                />
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                <div>
                                    <h3 className="text-lg font-semibold text-text-primary">Branch 2 (Optional)</h3>
                                    <p className="text-sm text-text-secondary mt-1">Do you need a second level of organization?</p>
                                    <p className="text-xs text-text-muted mt-2 p-2 bg-surface rounded border border-border">
                                        Examples:
                                        <br />
                                        Volume &gt; <strong>Section</strong> &gt; Part<br />
                                        Saga &gt; <strong>Arc</strong>
                                        <br />
                                        Series &gt; <strong>Season</strong> &gt; Episode
                                        <br />
                                        Series &gt; <strong>Issue</strong>
                                        <br />
                                        Book &gt; <strong>Act</strong>
                                        <br />
                                        Album &gt; <strong>Track</strong>
                                    </p>
                                </div>
                                <Input
                                    value={config.branch2Name}
                                    onChange={(e) => handleInputChange('branch2Name', e.target.value)}
                                    placeholder="e.g. Section"
                                    className="bg-surface text-lg py-6 focus-within:ring-accent"
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') onNext(); }}
                                />
                                <div className="flex items-center gap-3 p-3 bg-surface/50 border border-border rounded-lg">
                                    <Switch checked={config.branch2Persist} onCheckedChange={(c) => handleInputChange('branch2Persist', c)} disabled={!config.branch2Name.trim()} id="wiz-b2-persist" />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="wiz-b2-persist" className="text-sm font-medium cursor-pointer">Persist Numbers</Label>
                                        <p className="text-xs text-text-muted">Keep numbering continuous across parents (e.g. Vol 2, Sec 4 instead of Vol 2, Sec 1).</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                <div>
                                    <h3 className="text-lg font-semibold text-text-primary">Branch 3 (Optional)</h3>
                                    <p className="text-sm text-text-secondary mt-1">Do you need a third level of organization?</p>
                                    <p className="text-xs text-text-muted mt-2 p-2 bg-surface rounded border border-border">
                                        Examples:
                                        <br />
                                        Volume &gt; Section &gt; <strong>Part</strong>
                                        <br />
                                        Series &gt; Season &gt; <strong>Episode</strong>
                                    </p>
                                </div>
                                <Input
                                    value={config.branch3Name}
                                    onChange={(e) => handleInputChange('branch3Name', e.target.value)}
                                    placeholder="e.g. Part"
                                    className="bg-surface text-lg py-6 focus-within:ring-accent"
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter') onNext(); }}
                                />
                                <div className="flex items-center gap-3 p-3 bg-surface/50 border border-border rounded-lg">
                                    <Switch checked={config.branch3Persist} onCheckedChange={(c) => handleInputChange('branch3Persist', c)} disabled={!config.branch3Name.trim()} id="wiz-b3-persist" />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="wiz-b3-persist" className="text-sm font-medium cursor-pointer">Persist Numbers</Label>
                                        <p className="text-xs text-text-muted">Keep numbering continuous across parents.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                <div>
                                    <h3 className="text-lg font-semibold text-text-primary">Leaf Nodes</h3>
                                    <p className="text-sm text-text-secondary mt-1">What are the terminal pieces of your timeline where text/events actually occur?</p>
                                    <p className="text-xs text-text-muted mt-2 p-2 bg-surface rounded border border-border">
                                        Examples: <strong>Chapter</strong>, <strong>Scene</strong>, <strong>Episode</strong>
                                    </p>
                                </div>
                                <Input
                                    value={config.leafName}
                                    onChange={(e) => handleInputChange('leafName', e.target.value)}
                                    placeholder="e.g. Chapter"
                                    className="bg-surface text-lg py-6 focus-within:ring-accent"
                                    autoFocus
                                    onKeyDown={e => { if (e.key === 'Enter' && !isNextDisabled()) onNext(); }}
                                />
                                <div className="flex items-center gap-3 p-3 bg-surface/50 border border-border rounded-lg">
                                    <Switch checked={config.leafPersist} onCheckedChange={(c) => handleInputChange('leafPersist', c)} id="wiz-leaf-persist" />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="wiz-leaf-persist" className="text-sm font-medium cursor-pointer">Persist Numbers</Label>
                                        <p className="text-xs text-text-muted">Keep numbering continuous across parents (e.g. Part 2, Chapter 15 instead of Part 2, Chapter 1).</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-6 flex sm:justify-between items-center bg-surface/30 -mx-6 -mb-6 p-4 border-t border-border">
                    <Button variant="ghost" onClick={() => step > 0 ? setStep(s => s - 1) : onOpenChange(false)} className="text-text-muted hover:text-text-primary">
                        {step > 0 ? 'Back' : 'Cancel'}
                    </Button>
                    <div className="flex gap-2">
                        {/* Skip button for optional branches */}
                        {(step === 2 && !config.branch2Name.trim()) || (step === 3 && !config.branch3Name.trim()) ? (
                            <Button variant="secondary" onClick={onNext} className="gap-2">
                                Skip <SkipForward className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={onNext} disabled={isNextDisabled() || createMut.isPending} className="bg-accent hover:bg-accent-hover text-white min-w-[100px]">
                                {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : step === 4 ? (
                                    <>Finish <Check className="ml-2 h-4 w-4" /></>
                                ) : (
                                    <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function TimelineEditor({ timeline }: { timeline: Timeline }) {
    const qc = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);

    const [config, setConfig] = useState({
        name: timeline.name,
        branch1Name: timeline.branch1Name,
        branch2Enabled: !!timeline.branch2Name,
        branch2Name: timeline.branch2Name || 'Section',
        branch2Persist: timeline.branch2Persist,
        branch3Enabled: !!timeline.branch3Name,
        branch3Name: timeline.branch3Name || 'Part',
        branch3Persist: timeline.branch3Persist,
        leafName: timeline.leafName,
        leafPersist: timeline.leafPersist,
    });

    const previewPath = [
        config.branch1Name,
        config.branch2Enabled && config.branch2Name,
        config.branch3Enabled && config.branch3Name,
        config.leafName,
    ].filter(Boolean);

    const handleInputChange = (field: string, value: string | boolean) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const updateMut = useMutation({
        mutationFn: () => updateTimeline(timeline.id, {
            name: config.name,
            branch1Name: config.branch1Name,
            branch2Name: config.branch2Enabled ? config.branch2Name : null,
            branch3Name: config.branch3Enabled ? config.branch3Name : null,
            leafName: config.leafName,
            branch2Persist: config.branch2Persist,
            branch3Persist: config.branch3Persist,
            leafPersist: config.leafPersist,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tl', 'graphs'] });
            toast.success("Timeline updated");
            setIsEditing(false);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Error updating timeline');
        }
    });

    const deleteMut = useMutation({
        mutationFn: () => deleteTimeline(timeline.id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['tl', 'graphs'] });
            toast.success("Timeline deleted");
        }
    });

    return (
        <div className={`bg-surface rounded-xl border overflow-hidden shadow-sm transition-colors ${isEditing ? 'border-accent' : 'border-border'}`}>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/5 transition-colors" onClick={() => setIsEditing(!isEditing)}>
                <div className="flex flex-col">
                    <span className="font-medium text-text-primary text-base flex items-center gap-2">
                        {timeline.name}
                    </span>
                    <div className="text-xs text-text-muted mt-2 flex items-center font-medium bg-background/50 py-1 px-2 rounded-md border border-border w-fit">
                        <CornerDownRight className="h-3.5 w-3.5 text-accent mr-1.5" />
                        {previewPath.join(' > ')}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-error hover:bg-error/10 hover:text-error" onClick={(e) => { e.stopPropagation(); if (confirm('Delete Timeline?')) deleteMut.mutate(); }}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="text-text-muted bg-surface border border-border rounded-full p-1 shadow-sm">
                        {isEditing ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                </div>
            </div>

            {isEditing && (
                <div className="border-t border-border p-6 bg-background/50 space-y-6 animate-in slide-in-from-top-2 duration-200">
                    <section className="space-y-6">
                        <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-2">Structure Hierarchy</h3>

                        <div className="bg-surface rounded-xl border border-border divide-y divide-border">
                            {/* Timeline Root */}
                            <div className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-background/20 transition-colors">
                                <div className="w-40 text-sm font-semibold text-text-primary">Timeline Name</div>
                                <div className="flex-1">
                                    <Input value={config.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="e.g. Story" className="max-w-md bg-surface" />
                                </div>
                            </div>

                            {/* Branch 1 */}
                            <div className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-background/20 transition-colors">
                                <div className="w-40 text-sm font-semibold text-text-primary">Branch 1 (Top Level)</div>
                                <div className="flex-1">
                                    <Input value={config.branch1Name} onChange={(e) => handleInputChange('branch1Name', e.target.value)} placeholder="e.g. Volume" className="max-w-md bg-surface" />
                                </div>
                            </div>

                            {/* Branch 2 */}
                            <div className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-background/20 transition-colors">
                                <div className="w-40 flex items-center gap-2">
                                    <Switch checked={config.branch2Enabled} onCheckedChange={(c) => handleInputChange('branch2Enabled', c)} id={`b2-en-${timeline.id}`} />
                                    <Label htmlFor={`b2-en-${timeline.id}`} className="text-sm font-semibold text-text-primary cursor-pointer">Branch 2</Label>
                                </div>
                                <div className="flex-1">
                                    <Input value={config.branch2Name} onChange={(e) => handleInputChange('branch2Name', e.target.value)} disabled={!config.branch2Enabled} placeholder="e.g. Section" className="max-w-md bg-surface" />
                                </div>
                                <div className="flex items-center gap-2 bg-surface p-2 rounded-md border border-border">
                                    <Switch checked={config.branch2Persist} onCheckedChange={(c) => handleInputChange('branch2Persist', c)} disabled={!config.branch2Enabled} id={`b2-persist-${timeline.id}`} />
                                    <Label htmlFor={`b2-persist-${timeline.id}`} className="text-xs font-medium cursor-pointer">Persist #</Label>
                                </div>
                            </div>

                            {/* Branch 3 */}
                            <div className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-background/20 transition-colors">
                                <div className="w-40 flex items-center gap-2">
                                    <Switch checked={config.branch3Enabled} onCheckedChange={(c) => handleInputChange('branch3Enabled', c)} id={`b3-en-${timeline.id}`} />
                                    <Label htmlFor={`b3-en-${timeline.id}`} className="text-sm font-semibold text-text-primary cursor-pointer">Branch 3</Label>
                                </div>
                                <div className="flex-1">
                                    <Input value={config.branch3Name} onChange={(e) => handleInputChange('branch3Name', e.target.value)} disabled={!config.branch3Enabled} placeholder="e.g. Part" className="max-w-md bg-surface" />
                                </div>
                                <div className="flex items-center gap-2 bg-surface p-2 rounded-md border border-border">
                                    <Switch checked={config.branch3Persist} onCheckedChange={(c) => handleInputChange('branch3Persist', c)} disabled={!config.branch3Enabled} id={`b3-persist-${timeline.id}`} />
                                    <Label htmlFor={`b3-persist-${timeline.id}`} className="text-xs font-medium cursor-pointer">Persist #</Label>
                                </div>
                            </div>

                            {/* Leaf */}
                            <div className="p-4 flex flex-col md:flex-row md:items-center gap-4 hover:bg-background/20 transition-colors border-t border-dashed border-border">
                                <div className="w-40 text-sm font-semibold text-text-primary">Leaf Nodes</div>
                                <div className="flex-1">
                                    <Input value={config.leafName} onChange={(e) => handleInputChange('leafName', e.target.value)} placeholder="e.g. Chapter" className="max-w-md bg-surface" />
                                </div>
                                <div className="flex items-center gap-2 bg-surface p-2 rounded-md border border-border">
                                    <Switch checked={config.leafPersist} onCheckedChange={(c) => handleInputChange('leafPersist', c)} id={`leaf-persist-${timeline.id}`} />
                                    <Label htmlFor={`leaf-persist-${timeline.id}`} className="text-xs font-medium cursor-pointer">Persist #</Label>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end pt-2">
                        <Button className="bg-accent hover:bg-accent-hover text-white shadow-md" onClick={(e) => { e.stopPropagation(); updateMut.mutate(); }} disabled={updateMut.isPending}>
                            {updateMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Timeline Changes
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
