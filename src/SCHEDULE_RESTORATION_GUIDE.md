# Schedule Restoration Feature Guide

## Overview
The On2Cook system now automatically restores scheduled demos when refreshing data from Google Sheets. This ensures that team assignments and time slots are preserved across data refreshes.

## How It Works

### 1. Data Storage in Google Sheets
When demos are scheduled through the drag-and-drop interface, the system writes team member assignments to Column I of the Google Sheets:

**Format Options:**
- **Modern Format**: `Team member names | Time slot`
  - Example: `Kishore, Vikas | 11:00 AM - 1:00 PM`
- **Legacy Format**: `Scheduled: Team X at Y (Grid: row,col)`
  - Example: `Scheduled: Team 1 at 1:00 PM - 3:00 PM (Grid: 2,0)`

### 2. Data Restoration Process
When refreshing data from Google Sheets:

1. **Parse Column I**: Extract team member names and time slots
2. **Determine Team**: Match team members to their respective teams (1-4)
3. **Calculate Grid Position**: Map time slots to grid coordinates
4. **Restore Schedule**: Place demos back in their assigned positions
5. **Update Status**: Mark restored demos as 'assigned'

### 3. Team Mapping
The system automatically determines team numbers based on assigned members:

- **Team 1**: Manish, Pran Krishna, Shahid
- **Team 2**: Kishore, Vikas, Krishna
- **Team 3**: Bikram, Ganesh, Prathimesh
- **Team 4**: Additional team members as configured

### 4. Schedule Grid Restoration
- **Grid Row**: Determined by time slot index in TIME_SLOTS array
- **Grid Column**: Team number minus 1 (teams are 1-indexed, grid is 0-indexed)

## Benefits

### For Users
- **Persistent Schedules**: Team assignments survive data refreshes
- **Seamless Experience**: No need to re-assign demos after refresh
- **Automatic Recovery**: System handles schedule restoration transparently

### For System
- **Data Integrity**: Maintains scheduling state across sessions
- **Backup Mechanism**: Google Sheets serves as schedule backup
- **Audit Trail**: All assignments are preserved in spreadsheet

## Logging and Debugging

The system provides comprehensive logging for schedule restoration:

```
🔄 SCHEDULE RESTORE: Processing [Client Name] with assigned members: [member1, member2]
📍 SCHEDULE RESTORE: Determined team 2 for [Client Name] based on members: [Kishore, Vikas]
📍 SCHEDULE RESTORE: Calculated grid position for [Client Name]: row 2, col 1 (team 2, slot 11:00 AM - 1:00 PM)
✅ SCHEDULE RESTORE: Successfully restored schedule for [Client Name]
```

## Implementation Details

### CSV Parsing Enhancement
- **Client-side**: `utils/csvTransformers.ts` - Enhanced to parse Column I
- **Server-side**: `supabase/functions/server/csvDataService.tsx` - Similar parsing logic
- **Data Updates**: `utils/dataUpdateHelpers.ts` - Schedule restoration logic

### Key Functions
- `restoreScheduleFromSheets()`: Main restoration logic
- `transformClientSideCsvData()`: Client-side CSV parsing
- `transformSingleDemoRequest()`: Server-side CSV parsing

### Data Flow
1. **Fetch CSV**: Get latest data from Google Sheets
2. **Parse Assignments**: Extract team information from Column I
3. **Restore Schedule**: Apply schedule restoration logic
4. **Update State**: Place demos in correct grid positions
5. **Log Results**: Provide detailed restoration feedback

## Troubleshooting

### Common Issues
1. **Missing Team Assignments**: Check if Column I contains team member names
2. **Incorrect Team Mapping**: Verify team member names match TEAM_GROUPS configuration
3. **Grid Position Errors**: Ensure time slots match TIME_SLOTS array

### Debug Information
Check browser console for detailed restoration logs:
- Team assignment parsing
- Grid position calculations
- Restoration success/failure messages

## Future Enhancements
- Support for custom team configurations
- Enhanced time slot mapping
- Conflict resolution for schedule overlaps
- Bulk schedule import/export functionality