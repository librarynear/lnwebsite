'use server'

import prisma from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function getSession() {
  const supabase = await createClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  
  if (error || !authUser) return null;

  // Find user by Supabase ID (authId)
  let user = await prisma.user.findUnique({ where: { authId: authUser.id } });
  
  // Just-In-Time synchronization if user is missing in our DB!
  if (!user && authUser.email) {
    const name = authUser.user_metadata?.name || "New User";
    user = await prisma.user.upsert({
      where: { email: authUser.email },
      create: {
        authId: authUser.id,
        email: authUser.email,
        name: name,
        role: "STUDENT" 
      },
      update: {
        authId: authUser.id
      }
    });
  }

  if (!user) return null;

  return { userId: user.id, role: user.role };
}

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

export async function signup(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string

  if (!email || !password || !name) {
    return { error: 'Name, email, and password are required' }
  }

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name
      }
    }
  })

  if (error) {
    return { error: error.message }
  }

  // Create user in Prisma explicitly on signup for immediate availability
  if (data.user) {
    try {
      await prisma.user.upsert({
        where: { email },
        create: {
          authId: data.user.id,
          email,
          name,
          role: "STUDENT" 
        },
        update: {
          authId: data.user.id,
          name
        }
      });
    } catch (e) {
      console.error("Failed to sync user to DB on signup:", e);
    }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
