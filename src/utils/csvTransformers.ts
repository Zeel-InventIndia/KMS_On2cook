import { parseCsvDateAndTime, normalizeLeadStatus } from './helpers';
import type { DemoRequest } from '../App';
import { getRecipeImageUrl } from './recipeImageMapping';

export const transformClientSideCsvData = (demoData: string[][]) => {
  // Transform demo requests data with ACTUAL CSV FORMAT from your sheet: 
  // Full name, Email, Phone Number, Lead status, Sales rep, Assignee, Demo date
  const demoRequests = demoData.slice(1).map((row, index) => {
    console.log(`🔍 CSV DEBUG - Raw row ${index + 1}:`, row);
    
    // On2Cook "Demo_schedule" format: Full name, Email, Phone Number, Lead status, Sales rep, Assignee, Demo date
    const [
      clientName = '',        // Column A: Full name
      clientEmail = '',       // Column B: Email
      clientMobile = '',      // Column C: Phone Number
      leadStatus = 'demo_planned',  // Column D: Lead status
      salesRep = '',          // Column E: Sales rep
      assignee = '',          // Column F: Assignee
      demoDateTime = '',      // Column G: Demo date
      recipes = '',           // Column H: Recipes (added by system)
      teamAssignment = '',    // Column I: Team Assignment (team member names and time slot)
      mediaLink = '',         // Column J: Media Link (added by system)
      assignedTeam = '',      // Column K: Assigned Team (added by system)
      assignedSlot = '',      // Column L: Assigned Slot (added by system)
      status = 'pending'      // Column M: Status (added by system)
    ] = row;

    // Parse date and time using the robust parser
    const { date: parsedDate, time: parsedTime } = parseCsvDateAndTime(demoDateTime);

    // Normalize lead status using the helper function
    const normalizedLeadStatus = normalizeLeadStatus(leadStatus);
    
    // Parse schedule information from Column I (teamAssignment)
    let gridRow = null;
    let gridCol = null;
    let scheduledTeam = null;
    let scheduledTimeSlot = null;
    let assignedMembers: string[] = [];
    
    const teamAssignmentStr = String(teamAssignment).trim();
    console.log(`🔍 CSV DEBUG - Processing ${clientName} - Team assignment from Column I:`, teamAssignmentStr);
    
    if (teamAssignmentStr) {
      // Parse various formats of team assignment:
      // Format 1: "Team member names" (just names)
      // Format 2: "Team member names | Time slot" (names with time)
      // Format 3: "Scheduled: Team X at Y (Grid: row,col)" (legacy format)
      
      // Check for legacy schedule pattern first
      const legacyScheduleMatch = teamAssignmentStr.match(/Scheduled:\s*(.+?)\s+at\s+(.+?)\s+\(Grid:\s*(\d+),(\d+)\)/);
      if (legacyScheduleMatch) {
        scheduledTeam = legacyScheduleMatch[1];
        scheduledTimeSlot = legacyScheduleMatch[2];
        gridRow = parseInt(legacyScheduleMatch[3]);
        gridCol = parseInt(legacyScheduleMatch[4]);
        console.log(`📍 Found legacy schedule info for ${clientName}: ${scheduledTeam} at ${scheduledTimeSlot} (Grid: ${gridRow},${gridCol})`);
        
        // Extract individual team member names from team assignment
        if (scheduledTeam) {
          assignedMembers = scheduledTeam.split(',').map(name => name.trim()).filter(Boolean);
        }
      } else {
        // Parse modern format: "Team member names | Time slot" or just "Team member names"
        const parts = teamAssignmentStr.split('|').map(part => part.trim());
        
        if (parts.length >= 1) {
          // First part contains team member names
          const memberNames = parts[0];
          if (memberNames) {
            assignedMembers = memberNames.split(',').map(name => name.trim()).filter(Boolean);
            console.log(`👥 SCHEDULE RESTORE - Found assigned members for ${clientName}:`, assignedMembers);
          }
        }
        
        if (parts.length >= 2) {
          // Second part contains time slot
          scheduledTimeSlot = parts[1];
          console.log(`⏰ SCHEDULE RESTORE - Found scheduled time for ${clientName}:`, scheduledTimeSlot);
        }
        
        // Try to determine team number and grid position from assigned members
        if (assignedMembers.length > 0) {
          // Define team groups locally to match the updated 5-team structure
          const TEAM_GROUPS = {
            1: ['Manish', 'Pran Krishna'],
            2: ['Shahid', 'Kishore'], 
            3: ['Vikas', 'Krishna'],
            4: ['Bikram', 'Ganesh'],
            5: ['Prathimesh', 'Rajesh', 'Suresh']
          };
          
          // Find which team these members belong to (updated for 5 teams)
          for (let teamNum = 1; teamNum <= 5; teamNum++) {
            const teamMembers = TEAM_GROUPS[teamNum as keyof typeof TEAM_GROUPS] || [];
            const hasTeamMember = assignedMembers.some(member => 
              teamMembers.some(teamMember => 
                teamMember.toLowerCase().includes(member.toLowerCase()) ||
                member.toLowerCase().includes(teamMember.toLowerCase())
              )
            );
            
            if (hasTeamMember) {
              scheduledTeam = `Team ${teamNum}`;
              console.log(`📍 SCHEDULE RESTORE - Determined team from members for ${clientName}: ${scheduledTeam} (5-team structure)`);
              break;
            }
          }
        }
      }
    }

    // Add debugging for Vijay role
    console.log(`CSV Row ${index + 1}:`, {
      clientName: String(clientName).trim(),
      rawLeadStatus: leadStatus,
      normalizedLeadStatus: normalizedLeadStatus,
      rawDateTime: demoDateTime,
      parsedDate: parsedDate,
      parsedTime: parsedTime,
      salesRep: String(salesRep).trim(),
      assignee: String(assignee).trim(),
      mediaLink: String(mediaLink).trim(), // NEW: Log media link
      scheduledTeam,
      scheduledTimeSlot,
      gridPosition: gridRow !== null ? `${gridRow},${gridCol}` : null
    });

    const transformedRequest: DemoRequest = {
      id: `csv-demo-${index + 1}`,
      clientName: String(clientName).trim(),
      clientMobile: String(clientMobile).trim(),
      clientEmail: String(clientEmail).trim(),
      assignee: String(assignee).trim().toLowerCase(), // Normalize for matching
      salesRep: String(salesRep).trim(),
      leadStatus: normalizedLeadStatus,
      demoDate: parsedDate,
      demoTime: parsedTime,
      recipes: String(recipes).split(',').map(r => r.trim()).filter(Boolean),
      specialTag: undefined, // Will be determined based on other factors
      type: 'demo' as const,
      demoMode: 'onsite' as const,
      notes: teamAssignmentStr, // Store team assignment info in notes for backward compatibility
      assignedTeam: String(assignedTeam).trim() ? parseInt(String(assignedTeam).trim()) : undefined,
      assignedSlot: String(assignedSlot).trim() || undefined,
      status: ['pending', 'assigned', 'in_progress', 'completed'].includes(String(status).trim())
        ? String(status).trim() as 'pending' | 'assigned' | 'in_progress' | 'completed'
        : 'pending',
      completedBy: undefined,
      completedAt: undefined,
      mediaUploaded: Boolean(String(mediaLink).trim()), // Mark as uploaded if media link exists
      dropboxLink: String(mediaLink).trim() || undefined, // Use media link from sheets
      mediaLink: String(mediaLink).trim() || undefined, // NEW: Store original media link from sheets
      statusChangedAt: new Date().toISOString(),
      assignedMembers: assignedMembers, // Use parsed team members from Column I
      // Schedule information from Google Sheets notes
      gridRow: gridRow,
      gridCol: gridCol,
      scheduledTeam: scheduledTeam,
      scheduledTimeSlot: scheduledTimeSlot
    };

    return transformedRequest;
  }).filter(req => req.clientName && req.assignee);

  // Log schedule restoration summary
  const restoredSchedules = demoRequests.filter(req => req.assignedMembers && req.assignedMembers.length > 0);
  const scheduledDemos = demoRequests.filter(req => req.assignedTeam);
  
  console.log('📊 SCHEDULE RESTORE SUMMARY:', {
    totalDemos: demoRequests.length,
    withTeamAssignments: restoredSchedules.length,
    currentlyScheduled: scheduledDemos.length,
    restoredDemos: restoredSchedules.map(req => ({
      client: req.clientName,
      team: req.scheduledTeam || req.assignedTeam,
      timeSlot: req.scheduledTimeSlot || req.assignedSlot,
      members: req.assignedMembers
    }))
  });

  // Log demo_given requests specifically for debugging
  const demoGivenRequests = demoRequests.filter(req => req.leadStatus === 'demo_given');
  console.log('🎯 VIJAY DEBUG - Found demo_given requests:', demoGivenRequests.length, demoGivenRequests);
  
  // Log media link statistics
  const requestsWithMediaLink = demoRequests.filter(req => req.mediaLink);
  console.log('🔗 MEDIA LINK DEBUG - Requests with media links:', requestsWithMediaLink.length, requestsWithMediaLink.map(r => ({
    client: r.clientName,
    link: r.mediaLink
  })));

  // Return empty tasks array since we don't have task data in the CSV
  return { demoRequests, tasks: [] };
};

export const transformRecipeCsvData = (recipeData: string[][]) => {
  // Transform recipe data from CSV format
  // Expected columns: Recipe Name, Image Link, JSON Link, Category, Cuisine, Difficulty, Description
  
  if (!recipeData || recipeData.length < 2) {
    console.log('🔍 RECIPE CSV - No data or insufficient rows');
    return [];
  }
  
  console.log('🔍 RECIPE CSV - Header row:', recipeData[0]);
  console.log('🔍 RECIPE CSV - Total rows:', recipeData.length);
  
  const recipes = recipeData.slice(1).map((row, index) => {
    console.log(`🔍 RECIPE CSV - Raw row ${index + 1}:`, row);
    
    const [
      recipeName = '',
      imageLink = '',
      jsonLink = '',
      category = '',
      cuisine = '',
      difficulty = '',
      description = '',
      tags = '',
      prepTime = '',
      cookTime = '',
      servings = '',
      createdBy = ''
    ] = row;

    // Clean and validate data
    const cleanName = String(recipeName).trim();
    const cleanImageLink = String(imageLink).trim();
    const cleanJsonLink = String(jsonLink).trim();
    const cleanCategory = String(category).trim().toLowerCase();
    const cleanCuisine = String(cuisine).trim().toLowerCase();
    const cleanDifficulty = String(difficulty).trim().toLowerCase();
    const cleanDescription = String(description).trim();
    const cleanTags = String(tags).trim();
    const cleanCreatedBy = String(createdBy).trim();

    // Skip rows without a recipe name
    if (!cleanName) {
      console.log(`🔍 RECIPE CSV - Skipping row ${index + 1}: No recipe name`);
      return null;
    }

    // Parse numeric values
    const parsedPrepTime = parseInt(String(prepTime)) || 30;
    const parsedCookTime = parseInt(String(cookTime)) || 30;
    const parsedServings = parseInt(String(servings)) || 4;

    // Map categories to valid values
    const validCategories = ['appetizer', 'main_course', 'dessert', 'beverage', 'snack', 'fusion', 'traditional', 'healthy'];
    const mappedCategory = validCategories.includes(cleanCategory) ? cleanCategory : 'main_course';

    // Map cuisines to valid values
    const validCuisines = ['indian', 'chinese', 'continental', 'italian', 'mexican', 'thai', 'fusion', 'other'];
    const mappedCuisine = validCuisines.includes(cleanCuisine) ? cleanCuisine : 'indian';

    // Map difficulty to valid values
    const validDifficulties = ['easy', 'medium', 'hard'];
    const mappedDifficulty = validDifficulties.includes(cleanDifficulty) ? cleanDifficulty : 'medium';

    // Parse tags
    const parsedTags = cleanTags ? cleanTags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

    // Enhanced image handling - use mapped images when available
    let finalImageLink = cleanImageLink;
    
    // Try to get recipe-specific image from mapping
    const mappedImageUrl = getRecipeImageUrl(cleanName);
    if (mappedImageUrl) {
      console.log(`🎯 Using mapped image for ${cleanName}: ${mappedImageUrl.substring(0, 60)}...`);
      finalImageLink = mappedImageUrl;
    } else if (!cleanImageLink || cleanImageLink.length === 0) {
      console.log(`📷 No image available for ${cleanName} - will use fallback`);
      finalImageLink = ''; // Let the component handle fallback
    } else {
      console.log(`✅ Using CSV image link for ${cleanName}: ${cleanImageLink.substring(0, 60)}...`);
      finalImageLink = cleanImageLink;
    }

    const recipe = {
      id: `recipe-csv-${index + 1}`,
      name: cleanName,
      imageLink: finalImageLink, // Use processed image link
      jsonLink: cleanJsonLink || null,
      category: mappedCategory,
      cuisine: mappedCuisine,
      difficulty: mappedDifficulty,
      description: cleanDescription || `Delicious ${cleanName} recipe`,
      tags: parsedTags,
      preparationTime: parsedPrepTime,
      cookingTime: parsedCookTime,
      servings: parsedServings,
      createdBy: cleanCreatedBy || 'Recipe Import',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log(`🔍 RECIPE CSV - Transformed row ${index + 1}:`, {
      name: recipe.name,
      category: recipe.category,
      cuisine: recipe.cuisine,
      difficulty: recipe.difficulty,
      originalImageLink: cleanImageLink?.substring(0, 50) + (cleanImageLink?.length > 50 ? '...' : ''),
      finalImageLink: recipe.imageLink?.substring(0, 50) + (recipe.imageLink?.length > 50 ? '...' : ''),
      usingMappedImage: Boolean(mappedImageUrl),
      hasCustomImage: Boolean(cleanImageLink && cleanImageLink.length > 0),
      hasJson: Boolean(recipe.jsonLink),
      tagCount: recipe.tags.length
    });

    return recipe;
  }).filter(Boolean); // Remove null entries

  console.log(`✅ RECIPE CSV - Successfully transformed ${recipes.length} recipes`);
  return recipes;
};