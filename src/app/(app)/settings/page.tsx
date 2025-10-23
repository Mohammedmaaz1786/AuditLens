'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { users } from "@/lib/data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    email: '',
    role: 'Auditor'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
      
      // First, try to get from localStorage
      let storedName = localStorage.getItem('user_name');
      let storedEmail = localStorage.getItem('user_email');
      let storedRole = localStorage.getItem('user_role');
      
      // If not found, try parsing the user object
      if (!storedName || !storedEmail) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            storedName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            storedEmail = user.email;
            storedRole = user.role;
            
            // Store them for future use
            if (storedName) localStorage.setItem('user_name', storedName);
            if (storedEmail) localStorage.setItem('user_email', storedEmail);
            if (storedRole) localStorage.setItem('user_role', storedRole);
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
      
      if (!token) {
        // If no token, use localStorage data
        setUserProfile({
          name: storedName || 'Auditor User',
          email: storedEmail || 'auditor@auditlens.com',
          role: storedRole || 'Auditor'
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/v1/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const fullName = data.data.name || `${data.data.firstName || ''} ${data.data.lastName || ''}`.trim();
          setUserProfile({
            name: fullName || 'Auditor User',
            email: data.data.email || 'auditor@auditlens.com',
            role: data.data.role || 'Auditor'
          });
          // Store in localStorage for future use
          localStorage.setItem('user_name', fullName);
          localStorage.setItem('user_email', data.data.email);
          if (data.data.role) localStorage.setItem('user_role', data.data.role);
        }
      } else {
        // Fallback to localStorage
        setUserProfile({
          name: storedName || 'Auditor User',
          email: storedEmail || 'auditor@auditlens.com',
          role: storedRole || 'Auditor'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to localStorage
      const storedName = localStorage.getItem('user_name');
      const storedEmail = localStorage.getItem('user_email');
      const storedRole = localStorage.getItem('user_role');
      setUserProfile({
        name: storedName || 'Auditor User',
        email: storedEmail || 'auditor@auditlens.com',
        role: storedRole || 'Auditor'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      // Save to localStorage
      localStorage.setItem('user_name', userProfile.name);
      localStorage.setItem('user_email', userProfile.email);
      
      // Optionally save to backend
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch('http://localhost:5000/api/v1/auth/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: userProfile.name,
            email: userProfile.email,
          }),
        });
      }
      
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1">
        <h1 className="font-headline text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage your account and system settings.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="ml-models">ML Models</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and credentials.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      value={userProfile.name}
                      onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={userProfile.email}
                      onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input 
                      id="role" 
                      value={userProfile.role}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage users and their roles.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto custom-scrollbar">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="whitespace-nowrap">Name</TableHead>
                            <TableHead className="whitespace-nowrap">Email</TableHead>
                            <TableHead className="whitespace-nowrap">Role</TableHead>
                            <TableHead className="whitespace-nowrap">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium whitespace-nowrap">{user.name}</TableCell>
                                <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                                <TableCell className="whitespace-nowrap">{user.role}</TableCell>
                                <TableCell>
                                    <Badge variant={user.status === 'Active' ? 'default' : 'outline'}>{user.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ml-models">
          <Card>
            <CardHeader>
              <CardTitle>ML Model Configuration</CardTitle>
              <CardDescription>Tune parameters for fraud detection models.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="space-y-3">
                    <Label htmlFor="risk-threshold">Fraud Risk Threshold</Label>
                    <div className="flex items-center gap-4">
                        <Slider id="risk-threshold" defaultValue={[75]} max={100} step={1} className="flex-1" />
                        <span className="font-mono text-sm sm:text-lg whitespace-nowrap">75%</span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">Invoices with a risk score above this threshold will be automatically flagged.</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 sm:p-4">
                    <div className="space-y-0.5 flex-1 pr-4">
                        <Label className="text-sm sm:text-base">Automated Vendor Scoring</Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">Enable continuous risk assessment for vendors.</p>
                    </div>
                    <Switch defaultChecked />
                </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
