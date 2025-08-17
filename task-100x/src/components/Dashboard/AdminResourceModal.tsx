
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Plus, Edit, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { instructor } from '@/lib/api';

interface AdminResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingWeek?: number | null;
  existingResources?: Resource[];
  onResourcesAssigned: (week: number, resources: Resource[]) => void;
  cohortId: string | null;
  totalWeeks: number;
}

interface Resource {
  id?: string; // Make id optional as it might not be present when creating new resources
  title: string;
  type: 'VIDEO' | 'ARTICLE' | 'DOCUMENT'; // Changed to 'type' and aligned with backend enum
  url: string; // Changed to 'url'
  duration: number;
  tags: string[];
  isOptional?: boolean;
}

const AdminResourceModal = ({
  isOpen,
  onClose,
  editingWeek,
  existingResources = [],
  onResourcesAssigned,
  cohortId,
  totalWeeks
}: AdminResourceModalProps) => {
  const [selectedWeek, setSelectedWeek] = useState<number>(editingWeek || 1);
  const [resources, setResources] = useState<Resource[]>([]);

  const [newResource, setNewResource] = useState({
    title: '',
    type: 'VIDEO' as 'VIDEO' | 'ARTICLE' | 'DOCUMENT', // Changed to 'type' and default to 'VIDEO'
    url: '', // Changed to 'url'
    duration: 0,
    tags: [] as string[],
    isOptional: false
  });

  const [sessionDetails, setSessionDetails] = useState({
    sessionTitle: '',
    sessionDescription: ''
  });
  const [newResourceInputTags, setNewResourceInputTags] = useState('');
  // We no longer need editingResourceId as the backend doesn't uses it for updates.
  // Instead, we'll rely on the week number for resource assignment.
  const [editingResourceIndex, setEditingResourceIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();



  const validateResource = () => {
    if (!newResource.title.trim()) {
      toast({
        variant: "destructive",
        title: "Title is required",
        description: "Please enter a resource title."
      });
      return false;
    }
    if (!newResource.url.trim()) {
      toast({
        variant: "destructive",
        title: "URL is required",
        description: "Please enter a resource URL."
      });
      return false;
    }
    try {
      new URL(newResource.url);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid URL."
      });
      return false;
    }

    return true;
  };

  const addResource = () => {
    if (!validateResource()) return;

    const resource: Resource = {
      id: Date.now().toString(), // Assign a temporary unique ID
      title: newResource.title.trim(),
      type: newResource.type, // Changed to 'type'
      url: newResource.url.trim(), // Changed to 'url'
      duration: newResource.duration || 0,
      tags: newResourceInputTags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
      isOptional: newResource.isOptional || false,
    };
    const updatedResources = [...resources, resource];
    setResources(updatedResources);
    setNewResource({ 
      title: '', 
      type: 'VIDEO', 
      url: '', 
      duration: 0, 
      tags: [], 
      isOptional: false
    });
    setNewResourceInputTags('');
    toast({
      title: "Resource added",
      description: "The resource has been added to the list."
    });
  };

  const removeResource = async (indexToRemove: number) => {
    // const resourceToRemove = resources[indexToRemove];
    const updatedResources = resources.filter((_, index) => index !== indexToRemove);
    setResources(updatedResources);

    // if (resourceToRemove.id) { // Only attempt to delete if the resource has an ID (i.e., it exists in the backend)
    //   try {
    //     await instructor.deleteResource(resourceToRemove.id);
    //     toast({
    //       title: "Resource deleted",
    //       description: "The resource has been removed from the backend."
    //     });
    //   } catch (error) {
    //     toast({
    //       variant: "destructive",
    //       title: "Error deleting resource",
    //       description: "Failed to delete resource from backend. Please try again."
    //     });
    //   }
    // }

    toast({
      title: "Resource removed",
      description: "The resource has been removed from the list."
    });
  };

  const startEditingResource = (resource: Resource, index: number) => {
    setEditingResourceIndex(index);
    setNewResource({
      title: resource.title,
      type: resource.type,
      url: resource.url,
      duration: resource.duration || 0,
      tags: resource.tags || [],
      isOptional: resource.isOptional || false
    });
    setNewResourceInputTags(resource.tags.join(', '));

  };

  const updateResource = async () => {
    if (!validateResource()) return;

    const updatedResources = resources.map((r, index) => 
      index === editingResourceIndex 
        ? { 
            ...r,
            title: newResource.title.trim(),
            type: newResource.type, 
            url: newResource.url.trim(), 
            duration: newResource.duration || 0,
            tags: newResourceInputTags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
            isOptional: newResource.isOptional || false,
          }
        : r
    );
    setResources(updatedResources);
    setEditingResourceIndex(null);
    setNewResource({ 
      title: '', 
      type: 'VIDEO', 
      url: '', 
      duration: 0, 
      tags: [], 
      isOptional: false
    });
    setNewResourceInputTags('');

    toast({
      title: "Resource updated",
      description: "The resource has been updated successfully."
    });
    // Call onResourcesAssigned to persist the changes
  };

  const cancelEditing = () => {
    setEditingResourceIndex(null);
    setNewResource({ title: '', type: 'VIDEO', url: '', duration: 0, tags: [], isOptional: false });
    setNewResourceInputTags('');
  };

  const handleAssignResources = async () => {
    if (resources.length === 0) return;
    if (!cohortId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cohort ID not available. Cannot assign resources."
      });
      return;
    }
    
    setLoading(true);
    try {
      const resourcesToSend = resources.map(r => ({
        ...r,
        type: r.type.toUpperCase() as 'VIDEO' | 'ARTICLE' | 'DOCUMENT',
        isOptional: r.isOptional || false,
        sessionTitle: sessionDetails.sessionTitle || '',
        sessionDescription: sessionDetails.sessionDescription || ''
      }));

      await onResourcesAssigned(selectedWeek, resourcesToSend);
      toast({
        title: "Resources assigned",
        description: `Resources have been ${editingWeek ? 'updated' : 'assigned'} for Week ${selectedWeek}.`
      });
      handleClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error assigning resources",
        description: "Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset resources and newResource state when modal closes
    setResources([]);
    setNewResource({ 
      title: '', 
      type: 'VIDEO', 
      url: '', 
      duration: 0, 
      tags: [], 
      isOptional: false
    });
    setSessionDetails({
      sessionTitle: '',
      sessionDescription: ''
    });
    setEditingResourceIndex(null);
    setSelectedWeek(1); // Reset selected week to default
    setNewResourceInputTags('');
  };



  // Initialize resources when editing
  useEffect(() => {
    if (isOpen) {
      if (editingWeek) {
        setSelectedWeek(editingWeek);
        setResources(existingResources || []);
        setNewResourceInputTags(existingResources?.map(r => r.tags).flat().filter((value, index, self) => self.indexOf(value) === index).join(', ') || '');
        
        // If there are resources with session details, use the first one to set session details
        const resourceWithSessionDetails = existingResources?.find(r => r.sessionTitle || r.sessionDescription);
        if (resourceWithSessionDetails) {
          setSessionDetails({
            sessionTitle: resourceWithSessionDetails.sessionTitle || '',
            sessionDescription: resourceWithSessionDetails.sessionDescription || ''
          });
        }
      } else {
        setResources([]);
        setSelectedWeek(1);
        setNewResourceInputTags('');
      }
    }
  }, [isOpen, editingWeek, existingResources]);




  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] bg-orange-100 text-black">
        <DialogHeader>
          <DialogTitle className="text-orange-600">Assign Resources for Week {selectedWeek}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="week" className="text-right text-black">
              Week
            </Label>
            <Select
              onValueChange={(value) => setSelectedWeek(parseInt(value))}
              value={selectedWeek.toString()}
            >
              <SelectTrigger className="w-[180px] bg-orange-50 text-black border-orange-200">
                <SelectValue placeholder="Select a week" />
              </SelectTrigger>
              <SelectContent className="bg-orange-50 text-black border-orange-200">
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((weekNum) => (
                  <SelectItem key={weekNum} value={weekNum.toString()}>
                    Week {weekNum}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session Details */}


          {/* Add/Edit Resource Form */}
          <Card className="bg-orange-50 border-orange-500/30 rounded-2xl shadow-xl">
            <CardContent className="p-6 space-y-6">
              <h3 className="text-orange-400 font-semibold text-xl">
                {editingResourceIndex !== null ? 'Edit Resource' : 'Add New Resource'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-orange-300 text-sm font-medium">Title</label>
                  <input
                    type="text"
                    value={newResource.title}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                    className="w-full bg-orange-100 border border-orange-600/50 text-black px-4 py-2 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all duration-200 ease-in-out placeholder:text-gray-500"
                    placeholder="Resource title"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-orange-300">Duration (minutes)</label>
                    <input
                      id="duration"
                      type="number"
                      className="flex h-10 w-full rounded-xl border border-orange-500/30 bg-gray-800 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white transition-all duration-200 ease-in-out"
                      value={newResource.duration}
                      onChange={(e) => setNewResource({ ...newResource, duration: parseInt(e.target.value) || 0 })}
                      placeholder="e.g., 60"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="tags" className="text-sm font-medium text-orange-300">Tags (comma-separated)</label>
                    <input
                      className="flex h-10 w-full rounded-xl border border-orange-500/30 bg-orange-100 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-black transition-all duration-200 ease-in-out"
                      value={newResourceInputTags}
                      onChange={(e) => setNewResourceInputTags(e.target.value)}
                      placeholder="e.g., Python, AI, Beginner"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-orange-300 text-sm font-medium">Content Type</label>
                  <select
                    value={newResource.type}
                    onChange={(e) => setNewResource({ ...newResource, type: e.target.value as 'VIDEO' | 'ARTICLE' | 'DOCUMENT' })}
                    className="w-full bg-orange-100 border border-orange-600/50 text-black px-4 py-2 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all duration-200 ease-in-out"
                  >
                    <option value="VIDEO">Video</option>
                    <option value="ARTICLE">Article</option>
                    <option value="DOCUMENT">Document</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-orange-300 text-sm font-medium">Resource URL</label>
                  <input
                    type="url"
                    value={newResource.url}
                    onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                    className="w-full bg-orange-100 border border-orange-600/50 text-black px-4 py-2 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all duration-200 ease-in-out placeholder:text-gray-500"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isOptional"
                    className="h-4 w-4 rounded border border-orange-600 bg-orange-100 text-orange-500 focus:ring-orange-500 focus:ring-offset-orange-100"
                    checked={newResource.isOptional}
                    onChange={(e) => setNewResource({ ...newResource, isOptional: e.target.checked })}
                  />
                  <label htmlFor="isOptional" className="text-orange-300 text-sm cursor-pointer font-medium">Optional Resource</label>
              </div>
              
              <div className="flex gap-2">
                {editingResourceIndex !== null ? (
                  <>
                    <Button
                      onClick={updateResource}
                      className="bg-orange-600 text-white border border-orange-600 hover:bg-orange-700 rounded-xl shadow-md transition-all duration-200 ease-in-out"
                      disabled={loading}
                    >
                      Update Resource
                    </Button>
                    <Button
                      onClick={cancelEditing}
                      variant="outline"
                      className="border-orange-600/50 text-black hover:bg-orange-600/20 rounded-xl shadow-md transition-all duration-200 ease-in-out"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={addResource}
                    className="bg-orange-600 text-white border border-orange-600 hover:bg-orange-700 rounded-xl shadow-md transition-all duration-200 ease-in-out"
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Resource
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resources List */}
          {resources.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-orange-400 font-semibold text-xl">Resources for Week {selectedWeek}:</h3>
              {resources.map((resource, index) => (
                <Card key={resource.id || index} className="bg-orange-50 border-orange-500/20 rounded-2xl shadow-lg">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        resource.type === 'VIDEO' ? 'bg-red-500' :
                        resource.type === 'ARTICLE' ? 'bg-blue-500' : 'bg-green-500'
                      }`} />
                      <div>
                        <p className="text-orange-300 font-semibold text-base">{resource.title}</p>
                        <p className="text-sm text-gray-400 mt-1">{resource.type} • {resource.url}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditingResource(resource, index)}
                        className="text-cyan-400 hover:text-cyan-300 p-2 rounded-lg hover:bg-cyan-400/20 transition-colors duration-200 ease-in-out"
                        disabled={loading}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeResource(index)}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-400/20 transition-colors duration-200 ease-in-out"
                        disabled={loading}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="border-orange-600/50 text-black hover:bg-orange-600/20 rounded-xl shadow-md transition-all duration-200 ease-in-out"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignResources}
              disabled={resources.length === 0 || loading}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-md transition-all duration-200 ease-in-out"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} {editingWeek ? 'Update Resources' : 'Assign Resources'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminResourceModal;
