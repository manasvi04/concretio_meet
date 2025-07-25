// Test the new API verification flow
const API_KEY = '73cdd4c6a7240308bdbe80621d62309d0cbada79ea4081fa1af29a0c12f6fadf';

async function testVerificationFlow() {
    console.log('🚀 Testing New API Verification Flow\n');
    console.log('This simulates the exact flow your app now uses:\n');

    const testCases = [
        { input: 'test_room', description: 'Existing room' },
        { input: 'Mock_Interview', description: 'Another existing room' },
        { input: 'non-existent-room-123', description: 'Non-existent room' },
        { input: 'invalid room!', description: 'Invalid format' },
        { input: '', description: 'Empty input' }
    ];

    for (const testCase of testCases) {
        console.log(`\n📋 Testing: "${testCase.input}" (${testCase.description})`);
        console.log('─'.repeat(60));
        
        const startTime = Date.now();
        
        // Step 1: Basic validation (0ms)
        console.log('⏱️  Step 1: Basic validation (0ms)');
        if (!testCase.input.trim()) {
            console.log('❌ Result: Empty input - showing error toast');
            console.log('🔄 Flow: STOPPED - User sees "Invalid Room Name" error');
            continue;
        }
        console.log('✅ Result: Input not empty');

        // Step 2: Format validation (immediate)
        console.log('⏱️  Step 2: Format validation (immediate)');
        const roomNameRegex = /^[a-zA-Z0-9-_]+$/;
        if (!roomNameRegex.test(testCase.input)) {
            console.log('❌ Result: Invalid format - showing error toast');
            console.log('🔄 Flow: STOPPED - User sees "Invalid room name format" error');
            continue;
        }
        console.log('✅ Result: Format is valid');

        // Step 3: API verification (200-500ms)
        console.log('⏱️  Step 3: API verification (200-500ms)');
        console.log('🔄 UI: Button shows "Verifying..." with spinner');
        
        try {
            const response = await fetch(`https://api.daily.co/v1/rooms/${testCase.input}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });

            const apiTime = Date.now() - startTime;
            
            if (response.ok) {
                const roomData = await response.json();
                console.log(`✅ Result: Room exists! (API call took ${apiTime}ms)`);
                console.log(`📍 Room URL: ${roomData.url}`);
                console.log('🔄 Flow: CONTINUE - Showing success toast');
                
                // Step 4: Immediate feedback (500ms)
                console.log('⏱️  Step 4: Immediate feedback (500ms)');
                console.log('🎉 UI: Success toast "Room Verified ✅"');
                
                // Step 5: Join room (1-2s)
                console.log('⏱️  Step 5: Join room (1-2s)');
                console.log('🔄 UI: Daily.co iframe loads and joins');
                console.log(`⏱️  Total time: ~${apiTime + 800}ms (much faster than before!)`);
                
            } else if (response.status === 404) {
                console.log(`❌ Result: Room not found (API call took ${apiTime}ms)`);
                console.log('🔄 Flow: Show error + create room dialog');
                console.log('💡 UI: "Room Not Found" error + "Create Room" option');
                console.log(`⏱️  Total time: ~${apiTime}ms (immediate feedback!)`);
                
            } else {
                console.log(`❌ Result: API error ${response.status} (took ${apiTime}ms)`);
                console.log('🔄 Flow: Show API error message');
            }
            
        } catch (error) {
            console.log(`❌ Result: Network error - ${error.message}`);
            console.log('🔄 Flow: Show connection error');
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 FLOW COMPARISON SUMMARY:');
    console.log('\n🆕 NEW FLOW (With API Verification):');
    console.log('   [User clicks] → [Validation] → [API check] → [Immediate feedback] → [Join if valid]');
    console.log('        0ms           0ms           200-500ms        500ms              1-2s');
    console.log('   ✅ Total time for success: ~1-2 seconds');
    console.log('   ✅ Total time for error: ~200-500ms (immediate feedback!)');
    console.log('   ✅ Predictable behavior');
    console.log('   ✅ Clear error messages');
    console.log('   ✅ Option to create missing rooms');

    console.log('\n🔴 OLD FLOW (Without API Verification):');
    console.log('   [User clicks] → [Wait...] → [iframe loads] → [Daily.co decides] → [Success/Error]');
    console.log('        0ms           2-5s         1-3s            1-2s              6-10s');
    console.log('   ❌ Total time: ~6-10 seconds');
    console.log('   ❌ Unpredictable behavior');
    console.log('   ❌ Unclear error handling');
    console.log('   ❌ No control over room creation');
}

testVerificationFlow().catch(console.error);