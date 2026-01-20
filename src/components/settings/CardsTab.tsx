
"use client";

import { useState, useEffect } from "react";
import { useStoryStore } from "@/store/useStoryStore";
import { CardType, CardRole } from "@prisma/client";
import { Plus, Layout, Loader2, ArrowLeft, Users, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import CardTypeEditor from "@/components/cards/CardTypeEditor";

export default function CardsTab() {
    const { selectedStoryId } = useStoryStore();
    const [cardTypes, setCardTypes] = useState<CardType[]>([]);
    const [cardRoles, setCardRoles] = useState<CardRole[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

    // Create Type Dialog State
    const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false);
    const [newTypeName, setNewTypeName] = useState("");
    const [newTypeDesc, setNewTypeDesc] = useState("");

    // Create Role Dialog State
    const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleDesc, setNewRoleDesc] = useState("");
    const [selectedRoleType, setSelectedRoleType] = useState<string>(""); // Optional CardType ID connection

    const fetchData = async () => {
        if (!selectedStoryId) return;
        setLoading(true);
        try {
            const [typesRes, rolesRes] = await Promise.all([
                fetch(`/api/card-types?storyId=${selectedStoryId}`),
                fetch(`/api/card-roles?storyId=${selectedStoryId}`)
            ]);

            if (typesRes.ok) setCardTypes(await typesRes.json());
            if (rolesRes.ok) setCardRoles(await rolesRes.json());
        } catch (error) {
            console.error(error);
            toast.error("Failed to load card data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedStoryId]);

    const handleCreateType = async () => {
        if (!selectedStoryId) return;
        try {
            const res = await fetch(`/api/card-types`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyId: selectedStoryId,
                    name: newTypeName,
                    description: newTypeDesc
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create card type");
            }

            const newType = await res.json();
            toast.success("Card Type created");
            setIsCreateTypeOpen(false);
            setNewTypeName("");
            setNewTypeDesc("");

            await fetchData();
            setSelectedTypeId(newType.id);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleCreateRole = async () => {
        if (!selectedStoryId) return;
        try {
            const res = await fetch(`/api/card-roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyId: selectedStoryId,
                    name: newRoleName,
                    description: newRoleDesc,
                    cardTypeId: selectedRoleType || null
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create card role");
            }

            toast.success("Card Role created");
            setIsCreateRoleOpen(false);
            setNewRoleName("");
            setNewRoleDesc("");
            setSelectedRoleType("");

            await fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteRole = async (id: string) => {
        try {
            const res = await fetch(`/api/card-roles/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete role");
            toast.success("Role deleted");
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };


    if (!selectedStoryId) {
        return (
            <div className="p-8 text-center text-muted-foreground bg-surface rounded-lg border border-border">
                Please select a story to manage card settings.
            </div>
        );
    }

    if (selectedTypeId) {
        return (
            <div className="space-y-4 h-[calc(100vh-200px)]">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTypeId(null)} className="gap-1">
                        <ArrowLeft size={16} /> Back to Types
                    </Button>
                </div>
                <div className="flex flex-col border rounded-lg overflow-y-auto bg-background">
                    <CardTypeEditor
                        cardTypeId={selectedTypeId}
                        onClose={() => setSelectedTypeId(null)}
                    />
                </div>
            </div>
        );
    }

    return (
        <Tabs defaultValue="types" className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-foreground">Card Settings</h2>
                <TabsList>
                    <TabsTrigger value="types">Types</TabsTrigger>
                    <TabsTrigger value="roles">Roles</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="types" className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-md font-medium">Card Types</h3>
                        <p className="text-sm text-muted-foreground">Define templates for characters, locations, and more.</p>
                    </div>
                    <Dialog open={isCreateTypeOpen} onOpenChange={setIsCreateTypeOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-accent hover:bg-accent-hover"><Plus size={16} /> Create Type</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Card Type</DialogTitle>
                                <DialogDescription>Start a new template for your story cards.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="t-name">Name</Label>
                                    <Input id="t-name" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="e.g. Character" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="t-desc">Description</Label>
                                    <Input id="t-desc" value={newTypeDesc} onChange={e => setNewTypeDesc(e.target.value)} placeholder="Optional description" />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateType} disabled={!newTypeName}>Create</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cardTypes.map(type => (
                            <Card key={type.id} className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => setSelectedTypeId(type.id)}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">{type.name}</CardTitle>
                                    </div>
                                    <CardDescription className="line-clamp-2 min-h-[40px]">{type.description || "No description."}</CardDescription>
                                </CardHeader>
                                <CardFooter className="pt-2">
                                    <Button variant="secondary" className="w-full opacity-0 group-hover:opacity-100 transition-opacity h-8">Edit Template</Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </TabsContent>

            <TabsContent value="roles" className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-md font-medium">Card Roles</h3>
                        <p className="text-sm text-muted-foreground">Define roles cards play in events (e.g. Protagonist, Victim).</p>
                    </div>
                    <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-accent hover:bg-accent-hover"><Plus size={16} /> Create Role</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Card Role</DialogTitle>
                                <DialogDescription>Define a role that cards can take in events.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="r-name">Name</Label>
                                    <Input id="r-name" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="e.g. Protagonist" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="r-desc">Description</Label>
                                    <Input id="r-desc" value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} placeholder="Optional description" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="r-type">Restricted to Type (Optional)</Label>
                                    <select
                                        id="r-type"
                                        className="w-full p-2 border rounded-md bg-background"
                                        value={selectedRoleType}
                                        onChange={e => setSelectedRoleType(e.target.value)}
                                    >
                                        <option value="">Any Type</option>
                                        {cardTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateRole} disabled={!newRoleName}>Create</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cardRoles.length === 0 && <div className="col-span-full text-center p-8 text-muted-foreground border border-dashed rounded-lg">No roles defined.</div>}
                        {cardRoles.map(role => (
                            <Card key={role.id} className="group">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-purple-500/10 rounded-md text-purple-500"><Users size={20} /></div>
                                            <CardTitle className="text-base">{role.name}</CardTitle>
                                        </div>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={14} />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Role?</AlertDialogTitle>
                                                    <AlertDialogDescription>This specific role definition will be removed.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteRole(role.id)} className="bg-destructive">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                    <CardDescription className="line-clamp-2">{role.description || "No description."}</CardDescription>
                                </CardHeader>
                                <CardFooter className="pt-0 pb-3">
                                    <div className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                                        {(role as any).cardType ? `For: ${(role as any).cardType.name}` : "Universal"}
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}
