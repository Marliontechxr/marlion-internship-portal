import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const type = searchParams.get('type') || 'default';
  const name = searchParams.get('name') || 'Student';
  const stream = searchParams.get('stream') || 'Technology';
  const title = searchParams.get('title') || 'Marlion Internship';
  const subtitle = searchParams.get('subtitle') || '';
  const rating = searchParams.get('rating') || '';

  // Color schemes based on stream
  const streamColors: Record<string, { primary: string; secondary: string; accent: string }> = {
    'AR/VR Development': { primary: '#8B5CF6', secondary: '#A78BFA', accent: '#C4B5FD' },
    'Agentic AI': { primary: '#3B82F6', secondary: '#60A5FA', accent: '#93C5FD' },
    'Full Stack Apps': { primary: '#10B981', secondary: '#34D399', accent: '#6EE7B7' },
    'Data Science': { primary: '#F59E0B', secondary: '#FBBF24', accent: '#FCD34D' },
    'default': { primary: '#6366F1', secondary: '#818CF8', accent: '#A5B4FC' },
  };

  const colors = streamColors[stream] || streamColors['default'];

  if (type === 'certificate') {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)`,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Decorative elements */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.accent})`,
          }} />
          
          {/* Certificate badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '120px',
            height: '120px',
            borderRadius: '60px',
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            marginBottom: '24px',
            boxShadow: `0 0 40px ${colors.primary}40`,
          }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="white"/>
            </svg>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'white',
          }}>
            <div style={{
              fontSize: '18px',
              color: colors.accent,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}>
              Certificate of Completion
            </div>
            
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              marginBottom: '12px',
              background: `linear-gradient(90deg, white, ${colors.accent})`,
              backgroundClip: 'text',
              color: 'transparent',
            }}>
              {name}
            </div>
            
            <div style={{
              fontSize: '24px',
              color: '#94A3B8',
              marginBottom: '24px',
            }}>
              {stream} Internship
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill={colors.primary}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span style={{ color: 'white', fontSize: '18px' }}>Verified by Marlion Technologies</span>
            </div>
          </div>

          {/* Marlion branding */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px',
            }}>
              M
            </div>
            <span style={{ color: '#64748B', fontSize: '16px' }}>internship.marliontech.com</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }

  if (type === 'portfolio') {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: `linear-gradient(135deg, #0F172A 0%, #1E293B 100%)`,
            fontFamily: 'system-ui, sans-serif',
            padding: '48px',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '32px',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                fontSize: '14px',
                color: colors.accent,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}>
                Internship Portfolio
              </div>
              <div style={{
                fontSize: '42px',
                fontWeight: 'bold',
                color: 'white',
              }}>
                {name}
              </div>
              <div style={{
                fontSize: '20px',
                color: '#94A3B8',
                marginTop: '4px',
              }}>
                {stream}
              </div>
            </div>

            {/* Rating badge */}
            {rating && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                borderRadius: '12px',
              }}>
                <span style={{ fontSize: '24px', color: 'white', fontWeight: 'bold' }}>{rating}</span>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#FCD34D">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                <span style={{ color: 'white', fontSize: '16px' }}>Avg Rating</span>
              </div>
            )}
          </div>

          {/* Content area */}
          <div style={{
            flex: 1,
            display: 'flex',
            gap: '24px',
          }}>
            {/* Left: Project highlight */}
            <div style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ color: '#64748B', fontSize: '14px', marginBottom: '12px' }}>Featured Project</div>
              <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                {title || 'Innovative Solution'}
              </div>
              <div style={{ color: '#94A3B8', fontSize: '16px' }}>
                {subtitle || 'Building impactful technology for neurodiverse children'}
              </div>
            </div>

            {/* Right: Stats */}
            <div style={{
              width: '280px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              {[
                { label: 'Tasks Completed', icon: '✓' },
                { label: 'Skills Developed', icon: '⚡' },
                { label: 'Impact Created', icon: '🎯' },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <span style={{ fontSize: '24px' }}>{stat.icon}</span>
                  <span style={{ color: 'white', fontSize: '16px' }}>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '20px',
              }}>
                M
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>Marlion Technologies</span>
                <span style={{ color: '#64748B', fontSize: '12px' }}>Empowering Innovation</span>
              </div>
            </div>
            <span style={{ color: '#64748B', fontSize: '14px' }}>internship.marliontech.com</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }

  if (type === 'community') {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, #0F172A 0%, #1E293B 100%)`,
            fontFamily: 'system-ui, sans-serif',
            padding: '48px',
          }}
        >
          {/* Featured badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            borderRadius: '20px',
            marginBottom: '24px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>Featured Post</span>
          </div>

          {/* Author */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '32px',
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '28px',
              fontWeight: 'bold',
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>{name}</span>
              <span style={{ color: colors.accent, fontSize: '16px' }}>{stream} Intern</span>
            </div>
          </div>

          {/* Post content */}
          <div style={{
            maxWidth: '800px',
            textAlign: 'center',
            marginBottom: '32px',
          }}>
            <div style={{
              fontSize: '28px',
              color: 'white',
              lineHeight: 1.4,
            }}>
              "{title || 'Sharing my journey at Marlion Technologies'}"
            </div>
            {subtitle && (
              <div style={{
                fontSize: '18px',
                color: '#94A3B8',
                marginTop: '16px',
              }}>
                {subtitle}
              </div>
            )}
          </div>

          {/* Engagement hint */}
          <div style={{
            display: 'flex',
            gap: '24px',
          }}>
            {['❤️ Like', '💬 Comment', '🔗 Share'].map((action, i) => (
              <div key={i} style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#94A3B8',
                fontSize: '14px',
              }}>
                {action}
              </div>
            ))}
          </div>

          {/* Branding */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '14px',
            }}>
              M
            </div>
            <span style={{ color: '#64748B', fontSize: '14px' }}>Marlion Internship Community</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }

  // Default OG image
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: '0 0 60px rgba(99, 102, 241, 0.4)',
        }}>
          <span style={{ color: 'white', fontSize: '48px', fontWeight: 'bold' }}>M</span>
        </div>
        
        <div style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '12px',
        }}>
          Marlion Internship Portal
        </div>
        
        <div style={{
          fontSize: '24px',
          color: '#94A3B8',
        }}>
          Building Technology for Neurodiverse Children
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
