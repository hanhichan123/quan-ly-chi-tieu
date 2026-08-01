/*
 * MakeIcons.java — Sinh icon PNG cho PWA bằng Java thuần (không cần thư viện).
 *
 * Chạy 1 lần từ thư mục gốc của dự án (JDK 11 trở lên):
 *     java tools/MakeIcons.java
 *
 * Kết quả: icons/icon-192.png, icons/icon-512.png, icons/icon-maskable-512.png
 */

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;

public class MakeIcons {

    static final Color BLUE_DARK = new Color(0x1D4ED8);
    static final Color BLUE      = new Color(0x2563EB);
    static final Color WHITE     = Color.WHITE;
    static final Color GREEN     = new Color(0x4ADE80);
    static final Color AMBER     = new Color(0xFBBF24);

    public static void main(String[] args) throws IOException {
        File dir = new File("icons");
        if (!dir.exists() && !dir.mkdirs()) {
            System.err.println("Không tạo được thư mục icons/");
            System.exit(1);
        }

        write(render(192, false), new File(dir, "icon-192.png"));
        write(render(512, false), new File(dir, "icon-512.png"));
        write(render(512, true),  new File(dir, "icon-maskable-512.png"));

        System.out.println("Xong. Đã tạo 3 icon trong thư mục icons/");
    }

    /**
     * @param size    cạnh ảnh (px)
     * @param maskable true = nền tràn viền, nội dung co vào vùng an toàn 80%
     */
    static BufferedImage render(int size, boolean maskable) {
        BufferedImage img = new BufferedImage(size, size, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE);

        // --- Nền ---
        g.setPaint(new GradientPaint(0, 0, BLUE, size, size, BLUE_DARK));
        if (maskable) {
            g.fillRect(0, 0, size, size);
        } else {
            double r = size * 0.22;
            g.fill(new RoundRectangle2D.Double(0, 0, size, size, r, r));
        }

        // --- Vùng vẽ nội dung ---
        double inset = maskable ? size * 0.22 : size * 0.20;
        double x0 = inset, y0 = inset;
        double w = size - inset * 2, h = size - inset * 2;

        // --- Ba cột biểu đồ, cột cuối màu hổ phách (ý: sắp chạm hạn mức) ---
        double barW = w * 0.20;
        double gap = (w - barW * 3) / 2;
        double baseY = y0 + h * 0.92;
        double[] heights = { h * 0.40, h * 0.62, h * 0.86 };
        Color[] colors = { WHITE, WHITE, AMBER };

        for (int i = 0; i < 3; i++) {
            double bx = x0 + i * (barW + gap);
            double bh = heights[i];
            g.setColor(colors[i]);
            g.fill(new RoundRectangle2D.Double(bx, baseY - bh, barW, bh, barW * 0.42, barW * 0.42));
        }

        // --- Dấu tích xanh (ý: quản lý công việc) ở góc trên phải ---
        double ck = size * 0.30;
        double cx = x0 + w - ck * 0.52;
        double cy = y0 + ck * 0.10;

        g.setColor(GREEN);
        g.fill(new Ellipse2D.Double(cx - ck / 2, cy - ck / 2, ck, ck));

        g.setColor(new Color(0x0B3B1E));
        g.setStroke(new BasicStroke((float) (ck * 0.14), BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        Path2D check = new Path2D.Double();
        check.moveTo(cx - ck * 0.22, cy + ck * 0.02);
        check.lineTo(cx - ck * 0.04, cy + ck * 0.19);
        check.lineTo(cx + ck * 0.24, cy - ck * 0.19);
        g.draw(check);

        g.dispose();
        return img;
    }

    static void write(BufferedImage img, File out) throws IOException {
        if (!ImageIO.write(img, "png", out)) {
            throw new IOException("Không ghi được PNG: " + out);
        }
        System.out.println("  -> " + out.getPath() + "  (" + img.getWidth() + "px)");
    }
}
