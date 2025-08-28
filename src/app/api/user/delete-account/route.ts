import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from '@/lib/auth-server'

// Production-ready account deletion with database security functions
// No service role keys exposed - all privileged operations use SECURITY DEFINER functions

export async function POST(request: NextRequest) {
  try {
    const { confirmationPhrase } = await request.json()
    
    if (!confirmationPhrase || typeof confirmationPhrase !== 'string') {
      return NextResponse.json(
        { error: 'Confirmation phrase is required' },
        { status: 400 }
      )
    }
    
    // Get authenticated client
    const authResult = await createAuthenticatedClient()
    if (!authResult) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }
    
    const { client: supabase, user } = authResult
    const userId = user.id
    
    // Validate confirmation phrase matches user's email
    if (confirmationPhrase.toLowerCase().trim() !== (user.email || '').toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid confirmation - must match your email address exactly' },
        { status: 400 }
      )
    }
    
    // Create deletion request record for audit trail using authenticated client
    // Only stores user_id (non-personal) and metadata for GDPR compliance
    // Note: Ignores user_email and confirmation_phrase columns (will be dropped by migration)
    const { data: deletionRequest, error: auditError } = await supabase
      .from('deletion_requests')
      .insert({
        user_id: userId,
        status: 'processing',
        requested_by_user: true
      })
      .select('id')
      .single()
    
    if (auditError) {
      console.error('Failed to create deletion audit record:', auditError)
      return NextResponse.json(
        { error: 'Failed to process deletion request' },
        { status: 500 }
      )
    }
    
    const auditId = deletionRequest.id
    const deletedData: Record<string, number> = {}
    
    try {
      // Delete user data in order (most dependent first)
      
      // 1. Delete feedback
      const { error: feedbackError, count: feedbackCount } = await supabase
        .from('feedback')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
      
      if (feedbackError) throw new Error(`Failed to delete feedback: ${feedbackError.message}`)
      deletedData.feedback = feedbackCount || 0
      
      // 2. Delete rate limiting data
      const { error: rateLimitUserError, count: rateLimitUserCount } = await supabase
        .from('rate_limit_user')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
      
      if (rateLimitUserError) throw new Error(`Failed to delete rate_limit_user: ${rateLimitUserError.message}`)
      deletedData.rate_limit_user = rateLimitUserCount || 0
      
      const { error: rateLimitViolationsError, count: rateLimitViolationsCount } = await supabase
        .from('rate_limit_violations')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
      
      if (rateLimitViolationsError) throw new Error(`Failed to delete rate_limit_violations: ${rateLimitViolationsError.message}`)
      deletedData.rate_limit_violations = rateLimitViolationsCount || 0
      
      // 3. Delete recipes
      const { error: recipesError, count: recipesCount } = await supabase
        .from('recipes')
        .delete({ count: 'exact' })
        .eq('user_id', userId)
      
      if (recipesError) throw new Error(`Failed to delete recipes: ${recipesError.message}`)
      deletedData.recipes = recipesCount || 0
      
      // 4. Delete user profile
      const { error: profileError, count: profileCount } = await supabase
        .from('user_profiles')
        .delete({ count: 'exact' })
        .eq('id', userId)
      
      if (profileError) throw new Error(`Failed to delete user_profiles: ${profileError.message}`)
      deletedData.user_profiles = profileCount || 0
      
      // 5. Delete auth user record using secure database function
      const { data: authDeletionResult, error: authDeletionError } = await supabase
        .rpc('delete_current_user_auth_record')
      
      if (authDeletionError) {
        throw new Error(`Failed to delete auth user: ${authDeletionError.message}`)
      }
      
      // Check if the deletion was successful
      if (authDeletionResult === true) {
        deletedData.auth_users = 1
      } else {
        throw new Error('Auth user deletion returned false - user may not exist or deletion failed')
      }
      
      // Update audit record with completion using authenticated client
      await supabase
        .from('deletion_requests')
        .update({
          status: 'completed',
          data_deleted: deletedData
        })
        .eq('id', auditId)
      
      // Note: api_usage data is preserved (no CASCADE DELETE constraint)
      // This maintains cost tracking data for business purposes (GDPR compliant)
      
      return NextResponse.json({
        message: 'Account successfully deleted',
        deletedData
      })
      
    } catch (deletionError) {
      const errorMessage = deletionError instanceof Error ? deletionError.message : 'Unknown deletion error'
      
      // Update audit record with error using authenticated client
      await supabase
        .from('deletion_requests')
        .update({
          status: 'failed',
          error_details: errorMessage,
          data_deleted: deletedData // Partial data that was deleted before error
        })
        .eq('id', auditId)
      
      console.error('Account deletion error:', errorMessage, deletedData)
      
      return NextResponse.json(
        { 
          error: 'Failed to complete account deletion',
          details: errorMessage,
          partialDeletion: deletedData
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Delete account API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}