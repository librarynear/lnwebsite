'use client'

import { useActionState } from 'react'
import { signup } from '@/app/actions/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account..." : "Create Account"}
    </Button>
  )
}

export default function SignupPage() {
  const [state, formAction] = useActionState(signup, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-primary mb-2">Join FocusDesk</h1>
          <p className="text-muted-foreground">Create an account to book your space</p>
        </div>

        <form action={formAction} className="space-y-5">
          {state?.error && (
            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-lg border border-red-200">
              {state.error}
            </div>
          )}

          {state?.success && (
            <div className="p-4 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 flex flex-col gap-2">
              <span className="font-bold text-base">Check your email!</span>
              <span>{state.success}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              name="name" 
              type="text" 
              placeholder="John Doe" 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="you@example.com" 
              required 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              placeholder="Min. 6 characters"
              required 
              minLength={6}
            />
          </div>

          <SubmitButton />
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
