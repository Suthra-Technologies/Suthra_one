# Bulk Upload Menu Items Guide

## Overview
The bulk upload feature allows you to add multiple menu items at once using Excel/CSV files or manual data entry.

## Limits and Performance
- **Maximum Items**: 500 items per upload (as requested)
- **Payload Size**: Up to 50MB supported
- **Batch Processing**: Large uploads are processed in batches of 100 items for optimal performance
- **Processing Time**: Large uploads (100+ items) may take longer - please be patient

## Supported Formats
- Excel files (.xlsx, .xls)
- CSV files (.csv)
- Manual CSV data entry

## Required Fields
- **Name**: Menu item name (string)
- **Price**: Base price (number)
- **Category**: Category name (string)

## Optional Fields
- **Subcategory**: Subcategory name (string)
- **Description**: Item description (string)
- **Image**: Image URL or path (string)
- **Food Type**: "veg" or "non-veg" (string)
- **Is Available**: "true" or "false" (boolean, defaults to true)
- **Is Catering Available**: "true" or "false" (boolean, defaults to true)

## Image Handling
The system supports multiple image formats:
- **Full URLs**: `https://example.com/image.jpg`
- **Relative paths**: `/images/menu/pizza.jpg`
- **Domain names**: `www.example.com/image.jpg` (automatically prefixed with https://)
- **Data URLs**: `data:image/jpeg;base64,...`

## CSV Format
```
Name, Price, Category, Subcategory, Description, ImageURL, FoodType, IsAvailable, IsCateringAvailable
Burger, 10.99, Main Course, Burgers, Delicious cheese burger, https://example.com/burger.jpg, non-veg, true, true
Pizza, 12.50, Main Course, Italian, Pizza Margherita, https://example.com/pizza.jpg, veg, true, true
```

## Separators Supported
- Comma (`,`)
- Pipe (`|`)
- Tab (`\t`)

## Excel Template
Download the template from the bulk upload dialog for the correct column headers.

## Processing Rules
1. **Size Validation**: Maximum 500 items per upload enforced on frontend and backend
2. **Duplicate Detection**: Items with duplicate names (case-insensitive) are skipped
3. **Category Resolution**: Category names are automatically resolved to category IDs
4. **Image Processing**: Image URLs are validated and processed
5. **Data Validation**: Invalid rows are skipped with appropriate error messages
6. **Batch Processing**: Large uploads are processed in batches for better performance

## Error Handling
- Empty files/rows are rejected
- Invalid price values are rejected
- Missing required fields are rejected
- Oversized uploads (>500 items) are rejected with clear message
- Detailed error messages are provided for debugging

## Performance Optimizations
- **Batch Processing**: Backend processes items in batches of 100
- **Memory Management**: Efficient duplicate checking with lean queries
- **Database Operations**: Optimized bulk insert with error handling
- **Logging**: Comprehensive logging for monitoring and debugging

## API Payload Structure
The bulk upload sends the following payload to the backend:
```typescript
{
  name: string;
  price: number;
  category: string;
  categories: string[];
  subcategory?: string;
  description?: string;
  image?: string;
  isAvailable: boolean;
  isCateringAvailable: boolean;
  isAutoDebit: boolean;
  foodType?: 'veg' | 'non-veg';
  availableDays: string[];
}
```

## Backend Improvements
- **Payload Size Limit**: Increased to 50MB to support large uploads
- **Validation**: Enhanced input validation with detailed error messages
- **Error Recovery**: Graceful handling of partial failures
- **Audit Logging**: Detailed audit logs for compliance and debugging

## Best Practices
1. **Test with Small Batches**: Start with 2-3 items to test your format
2. **Validate URLs**: Ensure image URLs are accessible
3. **Check Categories**: Verify category names match existing categories
4. **Use Template**: Download and use the provided Excel template
5. **Backup Data**: Export existing menu items before bulk uploads
6. **Large Uploads**: For >100 items, expect longer processing times
7. **Split Large Files**: If you have >500 items, split into multiple files

## Troubleshooting
- **"request entity too large"**: Fixed - now supports up to 50MB payloads
- **"No valid items found"**: Check required fields (Name, Price, Category)
- **"Failed to parse Excel"**: Ensure file format is supported and not corrupted
- **"Category not found"**: Verify category names match exactly
- **Image Issues**: Check image URLs are valid and accessible
- **"Maximum 500 items allowed"**: Split your data into smaller batches
- **Slow Processing**: Normal for large uploads (>100 items)

## Monitoring
- **Server Logs**: All bulk operations are logged with detailed metrics
- **Audit Trail**: Complete audit trail for compliance
- **Performance Metrics**: Processing time and item counts tracked
- **Error Tracking**: Detailed error logging for debugging

## Notes
- The system automatically handles category ID resolution
- All items are set as available by default unless explicitly marked false
- Food type validation accepts only "veg" or "non-veg"
- Available days are set to all days by default
- The bulk upload operation is logged for audit purposes
- Large uploads are processed efficiently with batch optimization
